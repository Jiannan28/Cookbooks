# -*- coding: utf-8 -*-

from flask import Flask
from flask import render_template

import pandas as pd 
import numpy as np
from sklearn.externals import joblib 
from sklearn.metrics import precision_score, recall_score

from bs4 import BeautifulSoup
import eli5

app = Flask(__name__)
global test
global xgb_clf


@app.route('/home')
def home():
	print('Reading data...')
	global test 
	test = pd.read_csv('C://Users/liuleo/Documents/KT/Python_template/Classification/test_output.csv',sep='|')

	print('Loading model...')
	global xgb_clf
	xgb_clf = joblib.load('C://Users/liuleo/Documents/KT/Python_template/Classification/test.pkl')

	num_claim = test.shape[0]
	alert_threshold = 0.1 #0.03

	test_sort = test.sort_values('m_target_proba', ascending=False).reset_index(drop=True)
	num_alert = int(test.shape[0] * alert_threshold)

	claim_alert_cols = ['custid', 'm_target','m_target_proba'] #'ACCIDENT_HOUR', 'investigate_flag', 'system_warning',
	test_alert = test_sort.head(num_alert)[claim_alert_cols]
	test_sort['fraud_flag_pred'] = 0
	test_sort.loc[:num_alert-1, 'fraud_flag_pred'] = 1
	precision = precision_score(test_sort['m_target'], (test_sort['m_target_proba']>0.22).astype(int))
	recall = recall_score(test_sort['m_target'], (test_sort['m_target_proba']>0.22).astype(int))
	precision = round(precision, 3)
	recall = round(recall, 3)

	test_alert['custid'] = test_alert['custid'].apply(lambda x : '<a href="/explain/{0}">{0}</a>'.format(x))
	#num_alert_invest = test_alert['m_target'].sum()
	#num_alert_sys = test_alert['m_target'].sum()
	num_fraud = test_alert['m_target'].sum()
	#num_fraud_invest = test_alert[test_alert.m_target==1]['m_target'].sum()
	#num_fraud_sys = test_alert[test_alert.m_target==1]['m_target'].sum()
	test_alert_soup = BeautifulSoup(test_alert.to_html(index=False, escape=False), "html.parser")    
	test_alert_soup.find('table')['id'] = 'claim-table'
	for link in test_alert_soup.findAll('a'):
		link['target'] = '_blank'
	
	return render_template('home.html', num_claim=num_claim, alert_threshold=alert_threshold, 
		num_alert=num_alert, precision_score=precision, recall_score=recall, claim_alert_table=test_alert_soup, 
		num_fraud=num_fraud) #num_alert_invest=num_alert_invest, num_alert_sys=num_alert_sys,num_fraud_invest=num_fraud_invest, num_fraud_sys=num_fraud_sys 


@app.route('/explain/<claim_report_no>')
def explain_score(claim_report_no):
	claim_report_no = int(claim_report_no)
	get = test[test['custid']==claim_report_no].reset_index(drop=True)
	exps = eli5.explain_prediction(xgb_clf, get[xgb_clf.booster().feature_names].iloc[0], top=20)
	score_explain = eli5.format_as_html(exps, show=('targets', 'feature_importances'), show_feature_values=True)
	fraud_flag = get['m_target'].values[0]
	proba_fraud = get['m_target_proba'].values[0]
	return render_template('explain.html', claim_report_no=claim_report_no, score_explain=score_explain, fraud_flag=fraud_flag, proba_fraud=proba_fraud) 

if __name__ == '__main__':
	app.run(host='0.0.0.0',debug=True)


