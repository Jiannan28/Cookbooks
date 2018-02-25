# -*- coding: utf-8 -*-

from flask import Flask
from flask import render_template
from flask import redirect, url_for

import pandas as pd 
import numpy as np
from sklearn.externals import joblib 
from sklearn.metrics import precision_score, recall_score, roc_auc_score, accuracy_score, average_precision_score
from jllib import feat_imp

from bs4 import BeautifulSoup
import eli5
from PIL import Image
import os
from pdpbox import pdp
import io
import matplotlib.pyplot as plt
import base64

app = Flask(__name__)
global test
global xgb_clf
global TARGET
global TARGET_PROBA
global ID


@app.route('/')
def index():
    return redirect(url_for('home'))


@app.route('/home')
def home():
	
	PRED_RESULTS = 'C://Users/liuleo/Documents/KT/Python_template/Classification/test_output.csv'
	MODEL_PATH = 'C://Users/liuleo/Documents/KT/Python_template/Classification/test.pkl'
	old_TARGET = 'm_target'
	old_TARGET_PROBA = 'm_target_proba'
	old_ID = 'custid'
	global TARGET
	global TARGET_PROBA
	global ID
	TARGET = 'REAL_TARGET'
	TARGET_PROBA = 'PREDICTION_SCORE'
	ID = 'RECORD_ID'
	alert_threshold = 0.1 #0.03
	PRED_LABEL_THRESHOLD = 0.22
	
	STATIC_FOLDER = os.path.join('static', 'images')
	xval_panel = os.path.join(STATIC_FOLDER, 'xval.png')
	feat_imp_panel = os.path.join(STATIC_FOLDER,'feat_imp.png')
	
	print('Reading data...')
	global test 
	test = pd.read_csv(PRED_RESULTS, sep='|')
	test = test.rename(columns={old_TARGET: TARGET,
								old_TARGET_PROBA: TARGET_PROBA,
								old_ID : ID})

	print('Loading model...')
	global xgb_clf
	xgb_clf = joblib.load(MODEL_PATH)
	
	# print('Loading Xval results... ')
	# img = Image.open(XVAL_PATH)

	
	num_lead = test.shape[0]
	

	test_sort = test.sort_values(TARGET_PROBA, ascending=False).reset_index(drop=True)
	num_alert = int(test.shape[0] * alert_threshold)

	claim_alert_cols = [ID, TARGET,TARGET_PROBA] #'ACCIDENT_HOUR', 'investigate_flag', 'system_warning',
	test_alert = test_sort.head(num_alert)[claim_alert_cols]
	#test_sort['fraud_flag_pred'] = 0
	#test_sort.loc[:num_alert-1, 'fraud_flag_pred'] = 1
	precision = precision_score(test_sort[TARGET], (test_sort[TARGET_PROBA]>PRED_LABEL_THRESHOLD).astype(int))
	recall = recall_score(test_sort[TARGET], (test_sort[TARGET_PROBA]>PRED_LABEL_THRESHOLD).astype(int))
	roc_score = roc_auc_score(test_sort[TARGET], test_sort[TARGET_PROBA])
	acc_score = accuracy_score(test_sort[TARGET], (test_sort[TARGET_PROBA]>PRED_LABEL_THRESHOLD).astype(int))
	avg_pre_score = average_precision_score(test_sort[TARGET], test_sort[TARGET_PROBA])
	
	#calculate lift @ 10%
	cust_rank = test_sort[[TARGET, TARGET_PROBA]].copy()
	cust_rank = cust_rank.sort_values(by=TARGET_PROBA, ascending=False).reset_index(drop=True)
	cust_rank['rank'] = cust_rank.index + 1
	cust_rank['num_pos_target'] = np.cumsum(cust_rank[TARGET])
	pos_rate = test_sort[TARGET].mean()
	
	lift_cums = []
	
	for q in range(10, 110, 10):
		small_q = (q - 10) / 100.0
		big_q = q / 100.0
		if q == 100:
			lift_cum = cust_rank[TARGET].mean() / pos_rate
		else:
			lift_cum = cust_rank[: int(big_q * cust_rank.shape[0])][TARGET].mean() / pos_rate
		lift_cums.append(lift_cum)
	
	lift = lift_cums[0]
	lift = round(lift,2)
	
	precision = round(precision, 3)
	recall = round(recall, 3)
	roc_score = round(roc_score, 3)
	acc_score = round(acc_score, 3)
	avg_pre_score = round(avg_pre_score, 3)
	
	feat_imp_sort_df = feat_imp.feat_imp_xgb(xgb_clf, xgb_clf.booster().feature_names)
	feat_imp_sort_df = feat_imp_sort_df[::-1].reset_index(drop=True)
	feat_imp_sort_df = feat_imp_sort_df[['feature','abs_imp','relative_imp']]
	feat_imp_sort_df['abs_imp'] = feat_imp_sort_df['abs_imp'].apply(lambda x: np.round(x,1))
	feat_imp_sort_df['relative_imp'] = feat_imp_sort_df['relative_imp'].apply(lambda x: np.round(x,1))
	feat_imp_sort_df['feature'] = feat_imp_sort_df['feature'].apply(lambda x : '<a href="/pdp/{0}">{0}</a>'.format(x))
	feat_imp_sort_df_soup = BeautifulSoup(feat_imp_sort_df.to_html(index=False, escape=False), "html.parser")
	feat_imp_sort_df_soup.find('table')['id'] = 'feat-table'
	for link in feat_imp_sort_df_soup.findAll('a'):
		link['target'] = '_blank'	
	
	# add the link to children pages (for each record ID)
	test_alert[ID] = test_alert[ID].apply(lambda x : '<a href="/explain/{0}">{0}</a>'.format(x))
	num_pos = test_alert[TARGET].sum()
	# create html page for a table from pandas dataframe. Initiate with BeautifulSoup to ease the modifications afterwards
	test_alert_soup = BeautifulSoup(test_alert.to_html(index=False, escape=False), "html.parser")    
	test_alert_soup.find('table')['id'] = 'record-table'
	for link in test_alert_soup.findAll('a'):
		link['target'] = '_blank'
	
	return render_template('home.html', num_lead=num_lead, alert_threshold=alert_threshold, 
		num_alert=num_alert, precision_score=precision, recall_score=recall, record_alert_table=test_alert_soup, 
		num_pos=num_pos,
		roc_score = roc_score, 
		acc_score=acc_score, 
		avg_pre_score=avg_pre_score,
		lift = lift,
		img_path=xval_panel,
		feat_imp=feat_imp_panel,
		feat_table=feat_imp_sort_df_soup)


@app.route('/explain/<lead_no>')
def explain_score(lead_no):
	nb_feat = 20
	lead_no = int(lead_no)
	get = test[test[ID]==lead_no].reset_index(drop=True)
	exps = eli5.explain_prediction(xgb_clf, get[xgb_clf.booster().feature_names].iloc[0], top=nb_feat)
	score_explain = eli5.format_as_html(exps, show=('targets', 'feature_importances'), show_feature_values=True)
	target_flag = get[TARGET].values[0]
	proba_target= get[TARGET_PROBA].values[0]
	proba_target = round(proba_target, 3)
	return render_template('explain.html', lead_no=lead_no, score_explain=score_explain, target_flag=target_flag, proba_target=proba_target, nb_feat=nb_feat)

@app.route('/pdp/<feat>')
def pdp_feat(feat):
	pdp_obj = pdp.pdp_isolate(xgb_clf, test[xgb_clf.booster().feature_names], str(feat))
	pdp.pdp_plot(pdp_obj, str(feat), plot_org_pts=True, x_quantile=True)
	buf = io.BytesIO()
	plt.savefig(buf, format='png')
	buf.seek(0)
	img_tag = "<img class='pdp_plot' src='data:image/png;base64," + base64.b64encode(buf.getvalue()) + "'/>"
	buf.close()
	
	pdp.actual_plot(pdp_obj, str(feat))
	buf2 = io.BytesIO()
	plt.savefig(buf2, format='png')
	buf2.seek(0)
	img_tag_act = "<img class='act_plot' src='data:image/png;base64," + base64.b64encode(buf2.getvalue()) + "'/>"
	buf2.close()
	
	return render_template('pdp.html',feature_name = feat, img_html = img_tag, img_act_html = img_tag_act)

if __name__ == '__main__':
	app.run(debug=True) #host='0.0.0.0',


