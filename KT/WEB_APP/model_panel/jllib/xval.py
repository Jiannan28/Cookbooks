import seaborn as sns
sns.set_style('white')
import matplotlib.pyplot as plt

import pandas as pd
import numpy as np
from scipy import interp
import random

import warnings
warnings.filterwarnings('ignore')

import xgboost as xgb
from sklearn.cross_validation import ShuffleSplit
from sklearn.metrics import roc_curve,auc,precision_recall_curve
from sklearn.calibration import calibration_curve
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

import feat_imp


"""
function: cross validation function with customzied outputs
parameters:
_df: pandas DataFrame
dataset for cross validaion
_classifier: xgboost classifier
xgboost classifier
_features_columns: numpy array
Array of column names used as model features
_id: string
id of each training sample (customer id for example)
_target: string
name of model target
_prob: string
column name for prediction results
_n_iter: int (default 5)
Number of re-shuffling & splitting iterations
_test_size : float (default 0.3)
Between 0.0 and 1.0 and represent the proportion of the dataset to include in the test split
_random_state: int (default 0)
Pseudo-random number generator state used for random sampling
_early_stopping_rounds: int (default 40)
A window of the number of rounds over which no improvement is observed
"""



def run_cross_validation_xgb(_df, _classifier, _features_columns, _id, _target, _prob,
                              _n_iter=5, _test_size=.3, _random_state=0, _verbose=False, _early_stopping_rounds=40):
  


    # cross validation type can be changed here
    ss = ShuffleSplit(len(_df[_id].unique()), n_iter=_n_iter, test_size=_test_size, random_state=_random_state)
    
    results_cv_targeting = pd.DataFrame([], columns=[_id, _target, 'fold', _prob])

    mean_tpr = 0.0
    mean_fpr = np.linspace(0, 1, 100)
    
    mean_precision = 0.0
    mean_recall = np.linspace(0, 1, 100)
    
    mean_lift = 0.0
    mean_lift_decay = 0.0
    
    nb_calls_cv = pd.DataFrame([],columns=['nb_contacts', 'total_population', 'total_pos_targets', 'nb_pos_targets', 'pos_rate', 
                                           'Percentage_of_pos_targets_found', 'Percentage_of_Population', 'Lift'])
    
    feature_importances = pd.DataFrame([], columns=['feature', 'importance', 'fold'])

    fig = plt.figure(figsize=(6, 12))
    fig.subplots_adjust(bottom=-0.5, left=-0.5, top=0.5, right=1.5)

    print ('modeling started')
    plt.gcf().clear()
    
    colors = ['#d7191c','#fdae61','#ffffbf','#abdda4','#2b83ba']
    plt.rcParams["font.family"] = "monospace"

    for i, (train_index, valid_index) in enumerate(ss):
        customer_id = _df[_id].unique().copy()
        shuffled_customer_id = np.array(sorted(customer_id, key=lambda k: random.random()))
        train_customer_id = shuffled_customer_id[train_index]
        valid_customer_id = shuffled_customer_id[valid_index]
        
        train = _df.loc[_df[_id].isin(train_customer_id), np.concatenate([_features_columns, [_target]],axis=0)].copy().reset_index(drop=True)
        valid = _df.loc[_df[_id].isin(valid_customer_id), np.concatenate([_features_columns, [_target]],axis=0)].copy().reset_index(drop=True)
        
        temp = valid[[_id, _target]].copy()
        temp['fold'] = i

        # modeling#
        train_X = train.drop([_id, _target], axis=1)
        valid_X = valid.drop([_id, _target], axis=1)

        train_Y = np.array(train[_target].astype(np.uint8))
        valid_Y = np.array(valid[_target].astype(np.uint8))
        
        probas_ = _classifier.fit(train_X, train_Y, eval_metric='auc', verbose=_verbose, eval_set=[(valid_X, valid_Y)],early_stopping_rounds=_early_stopping_rounds).predict_proba(valid_X)
        evals_result = _classifier.evals_result()['validation_0']['auc']
        
        probabilities = pd.DataFrame(data=probas_[:, 1], index=valid_X.index, columns=[_prob])

        temp = temp.join(probabilities, how='left')
        results_cv_targeting = results_cv_targeting.append(temp)


        ###############################################################################
        # Plot probability distribution
        plt.subplot(3,3,1)
        plt.hist(probas_[:, 1], range=(0, 1), bins=100, label="fold %d" % (i), color=colors[i], alpha=0.5)#histtype="step", 
        
        
        ###############################################################################
        # plot proba distribution for both class
        target_probs = pd.DataFrame(valid_Y, columns=['target'])
        target_probs['probs'] = probas_[:, 1]
        plt.subplot(3, 3, 2)
        plt.hist(target_probs[target_probs['target']==1]['probs'], range=(0, 1), bins=100, 
                 label="fold %d class 1" % (i), color='#abdda4', alpha=0.5)
        plt.hist(target_probs[target_probs['target']==0]['probs'], range=(0, 1), bins=100, 
                 label="fold %d class 0" % (i), color='#d53e4f', alpha=0.5)


        ###############################################################################
        # Plot calibration plots
        fraction_of_positives, mean_predicted_value = calibration_curve(valid_Y, probas_[:, 1], n_bins=20)
        plt.subplot(3,3,3)
        plt.plot(mean_predicted_value, fraction_of_positives, "P-", label="fold %d" % (i), lw=1, color=colors[i])


        ###############################################################################
        # plot evals_result
        plt.subplot(3, 3, 4)
        plt.plot(range(len(evals_result)), evals_result, label='Fold %d' %(i), lw=1, color=colors[i])


        ###############################################################################
        # Compute ROC curve and area the curve
        fpr, tpr, thresholds = roc_curve(valid_Y, probas_[:, 1])
        mean_tpr += interp(mean_fpr, fpr, tpr)
        mean_tpr[0] = 0.0
        roc_auc = auc(fpr, tpr)

        plt.subplot(3, 3, 5)
        plt.plot(fpr, tpr, label='Fold %d: %0.2f' % (i, roc_auc), lw=1, color=colors[i])

        
        ###############################################################################
        # Compute Precision-Recall curve and area the curve
        precision, recall, thresholds = precision_recall_curve(valid_Y, probas_[:, 1])
        mean_precision += interp(mean_recall, recall[::-1], precision[::-1])
        pr_auc = auc(recall, precision)

        plt.subplot(3, 3, 6)
        plt.plot(recall, precision, label='Fold %d: %0.2f' % (i, pr_auc), lw=1, color=colors[i])


        ###############################################################################
        # calculate lift related information
        cust_rank = temp[[_target, _prob]].copy()
        cust_rank = cust_rank.sort_values(by=_prob, ascending=False).reset_index(drop=True)
        cust_rank['rank'] = cust_rank.index + 1
        cust_rank['num_pos_target'] = np.cumsum(cust_rank[_target])
        pos_rate = temp[_target].mean()

        lift_cums = []
        lift_decays = []
        for q in range(10, 110, 10):
            small_q = (q - 10) / 100.0
            big_q = q / 100.0
            if q == 100:
                lift_cum = cust_rank[_target].mean() / pos_rate
                lift_decay = cust_rank[int(small_q * cust_rank.shape[0]) :][_target].mean() / pos_rate
            else:
                lift_cum = cust_rank[: int(big_q * cust_rank.shape[0])][_target].mean() / pos_rate
                lift_decay = cust_rank[int(small_q * cust_rank.shape[0]) : int(big_q * cust_rank.shape[0])][_target].mean() / pos_rate
            lift_cums.append(lift_cum)
            lift_decays.append(lift_decay)

        print ('shuffle: %i, AUC: %f, lift at 10 percent: %f' % (i, roc_auc, lift_cums[0]))
        mean_lift += np.array(lift_cums)
        mean_lift_decay += np.array(lift_decays)


        ###############################################################################
        # calculate number of calls
        nb_calls = cust_rank.copy()
        nb_calls['nb_contacts_100'] = nb_calls.loc[nb_calls.num_pos_target==100,'rank'].min()
        nb_calls['nb_contacts_200'] = nb_calls.loc[nb_calls.num_pos_target==200,'rank'].min()
        nb_calls['nb_contacts_500'] = nb_calls.loc[nb_calls.num_pos_target==500,'rank'].min()
        nb_calls['nb_contacts_1000'] = nb_calls.loc[nb_calls.num_pos_target==1000,'rank'].min()
        nb_calls['nb_contacts_2000'] = nb_calls.loc[nb_calls.num_pos_target==2000,'rank'].min()
        #nb_calls['nb_contacts_3000'] = nb_calls.loc[nb_calls.num_pos_target==3000,'rank'].min()
        nb_calls['nb_contacts_all'] = nb_calls.loc[nb_calls.num_pos_target==nb_calls.num_pos_target.max(),'rank'].min()

        nb_calls = nb_calls[['nb_contacts_100','nb_contacts_200', 'nb_contacts_500','nb_contacts_1000', 
        'nb_contacts_2000','nb_contacts_all']].min() #'nb_contacts_3000',
        nb_calls = pd.DataFrame(nb_calls,columns=['nb_contacts'])
        nb_calls['total_population'] = cust_rank.shape[0]
        nb_calls['total_pos_targets'] = cust_rank[_target].sum()
        nb_calls['nb_pos_targets']=[100,200,500,1000,2000, cust_rank[_target].sum()] #3000,
        nb_calls['pos_rate'] = nb_calls.nb_pos_targets/nb_calls.nb_contacts
        nb_calls['Percentage_of_pos_targets_found'] = nb_calls.nb_pos_targets/nb_calls.total_pos_targets
        nb_calls['Percentage_of_Population'] = nb_calls.nb_contacts/nb_calls.total_population
        nb_calls['Lift'] = nb_calls.Percentage_of_pos_targets_found/nb_calls.Percentage_of_Population

        nb_calls_cv = nb_calls_cv.append(nb_calls)
        
        
        ###############################################################################
        feature_importances_data = []
        features = train_X.columns
        for feature_name, feature_importance in feat_imp.get_importance(_classifier.booster(), 'gain').iteritems():
            feature_importances_data.append({
                'feature': feature_name,
                'importance': feature_importance
            })

        temp = pd.DataFrame(feature_importances_data)
        temp['fold'] = i
        feature_importances = feature_importances.append(temp)
     
    for feature in nb_calls_cv.columns.values:
        nb_calls_cv[feature] = pd.to_numeric(nb_calls_cv[feature], errors='coerce')
    
    nb_calls_cv = nb_calls_cv.reset_index().groupby('index').mean().sort_values(by='nb_pos_targets')
    results_cv_targeting = results_cv_targeting.reset_index(drop=True)
    
    feature_importances = feature_importances.groupby('feature')['importance'].agg([np.mean, np.std])
    feature_importances = feature_importances.sort_values(by='mean')
    feature_importances = feature_importances.reset_index()


    # plot probas for probas
    plt.subplot(3, 3, 1)
    plt.ylabel('proba', fontsize=10)
    plt.title('predicted probas', fontsize=12, fontweight="bold")
    #plt.legend(loc="lower right")


    # plot probas for both classes
    plt.subplot(3, 3, 2)
    plt.ylabel('proba', fontsize=10)
    plt.title('predicted probas for different classes', fontsize=12, fontweight="bold")
    #plt.legend(loc="lower right")


    # plot the perfectly calibrated curve
    plt.subplot(3,3,3)
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly calibrated", lw=1, color='grey')
    plt.ylabel("Fraction of positives", fontsize=10)
    plt.xlabel("Mean predicted value", fontsize=10)
    plt.ylim([-0.05, 1.05])
    #plt.legend(loc="lower right")
    plt.title('Calibration plots  (reliability curve)', fontsize=12, fontweight="bold")


    # plot evals_result
    plt.subplot(3, 3, 4)
    plt.xlabel('n_estimators', fontsize=10)
    plt.ylabel('roc_auc', fontsize=10)
    plt.title('ROC through n_estimators', fontsize=12, fontweight="bold")
    #plt.legend(loc="lower right")

    # plot the averaged ROC curve
    plt.subplot(3, 3, 5)
    mean_tpr /= len(ss)
    mean_tpr[-1] = 1.0
    mean_auc = auc(mean_fpr, mean_tpr)
    plt.plot(mean_fpr, mean_tpr, 'k--', label='Mean ROC: %0.2f' % mean_auc, lw=1, color='grey')
    plt.plot([0, 1], [0, 1], '--', color=(0.6, 0.6, 0.6))
    plt.xlim([-0.05, 1.05])
    plt.ylim([-0.05, 1.05])
    plt.xlabel('False Positive Rate', fontsize=10)
    plt.ylabel('True Positive Rate', fontsize=10)
    plt.title('ROC', fontsize=12, fontweight="bold")
    plt.legend(loc="lower right")


    # plot averaged PR curve
    plt.subplot(3, 3, 6)
    mean_precision /= len(ss)
    mean_pr_auc = auc(mean_recall, mean_precision)
    plt.plot(mean_recall, mean_precision, 'k--', label='Mean PR: %0.2f' % mean_pr_auc, lw=1, color='grey')
    plt.xlabel('Recall', fontsize=10)
    plt.ylabel('Precision', fontsize=10)
    plt.title('Precision-recall', fontsize=12, fontweight="bold")
    plt.legend(loc="lower right")
    
    def autolabel(rects, ax, mark):
        """
        Attach a text label above each bar displaying its height
        """
        for rect in rects:
            height = rect.get_height()
            if mark == 'int':
                ax.text(rect.get_x() + rect.get_width()/2., 1.05*height, '%d' % int(height), 
                        ha='center', va='bottom', fontsize=10)
            else:
                ax.text(rect.get_x() + rect.get_width()/2., 1.05*height, '%s' % str(round(height, 2)), 
                        ha='center', va='bottom', fontsize=10)

    # plot lift cumulative
    ax1 = plt.subplot(3, 3, 7)
    mean_lift /= len(ss)
    rects1 = plt.bar(range(10), mean_lift, color='#abdda4')
    plt.axhline(y=1, color='grey', linestyle='--', lw=1)
    plt.xticks(range(10), ['0-%d' %(num) for num in range(10, 110, 10)], rotation='vertical')
    plt.xlabel('Rank percentage interval', fontsize=10)
    plt.ylabel('lift', fontsize=10)
    plt.title('Lift cumulative plot', fontsize=12, fontweight="bold")
    plt.ylim([ax1.get_ylim()[0], ax1.get_ylim()[1] * 1.2])


    # plot lift decay
    ax2 = plt.subplot(3, 3, 8)
    mean_lift_decay /= len(ss)
    rects2 = plt.bar(range(10), mean_lift_decay, color='#fdae61')
    plt.axhline(y=1, color='grey', linestyle='--', lw=1)
    plt.xticks(range(10), ['%d-%d' %(num-10, num) for num in range(10, 110, 10)], rotation='vertical')
    plt.xlabel('Rank percentage interval', fontsize=10)
    plt.ylabel('lift', fontsize=10)
    plt.title('Lift decay plot', fontsize=12, fontweight="bold")
    plt.ylim([ax2.get_ylim()[0], ax2.get_ylim()[1] * 1.2])


    # plot number of calls
    ax3 = plt.subplot(3, 3, 9)
    rects3 = plt.bar(range(5), nb_calls_cv['nb_contacts'].values[:-1], color='#6baed6')
    plt.xticks(range(5), [100, 200, 500, 1000, 2000], rotation='vertical') #, 3000
    plt.xlabel('Number of target get', fontsize=10)
    plt.ylabel('Number of contacts', fontsize=10)
    plt.title('Number of calls', fontsize=12, fontweight="bold")
    plt.ylim([ax3.get_ylim()[0], ax3.get_ylim()[1] * 1.2])
    
    autolabel(rects1, ax1, 'float')
    autolabel(rects2, ax2, 'float')
    autolabel(rects3, ax3, 'int')
    
    fig.subplots_adjust(hspace=.25, wspace=0.25)
    
    plt.show()
    plt.gcf().clear()
    

    return results_cv_targeting, feature_importances, nb_calls_cv


"""
function: cross validation function with customzied outputs
parameters:
_df: pandas DataFrame
dataset for cross validaion
_classifier: object
sk random forest classifier
_features_columns: numpy array
Array of column names used as model features
_id: string
id of each training sample (customer id for example)
_target: string
name of model target
_prob: string
column name for prediction results
_n_iter: int (default 5)
Number of re-shuffling & splitting iterations
_test_size : float (default 0.3)
Between 0.0 and 1.0 and represent the proportion of the dataset to include in the test split
_random_state: int (default 0)
Pseudo-random number generator state used for random sampling
"""


def run_cross_validation_rf(_df, _classifier, _features_columns, _id, _target, _prob,_n_iter=5, _test_size=.3, _random_state=0):

    # cross validation type can be changed here
    ss = ShuffleSplit(len(_df[_id].unique()), n_iter=_n_iter, test_size=_test_size, random_state=_random_state)

    results_cv_targeting = pd.DataFrame([], columns=[_id, _target, 'fold', _prob])

    mean_tpr = 0.0
    mean_fpr = np.linspace(0, 1, 100)

    mean_precision = 0.0
    mean_recall = np.linspace(0, 1, 100)

    mean_lift = 0.0
    mean_lift_decay = 0.0

    nb_calls_cv = pd.DataFrame([],columns=['nb_contacts', 'total_population', 'total_pos_targets', 'nb_pos_targets', 'pos_rate', 'Percentage_of_pos_targets_found', 'Percentage_of_Population', 'Lift'])

    feature_importances = pd.DataFrame([], columns=['feature', 'importance', 'fold'])

    fig = plt.figure(figsize=(6, 12))
	fig.subplots_adjust(bottom=-0.5, left=-0.5, top=0.5, right=1.5)

	print ('modeling started')
	plt.gcf().clear()

	colors = ['#d7191c','#fdae61','#ffffbf','#abdda4','#2b83ba']
	plt.rcParams["font.family"] = "monospace"

    for i, (train_index, valid_index) in enumerate(ss):
        customer_id = _df[_id].unique().copy()
        shuffled_customer_id = np.array(sorted(customer_id, key=lambda k: random.random()))
        train_customer_id = shuffled_customer_id[train_index]
        valid_customer_id = shuffled_customer_id[valid_index]

        train = _df.loc[_df[_id].isin(train_customer_id), np.concatenate([_features_columns, [_target]],axis=0)].copy().reset_index(drop=True)
        valid = _df.loc[_df[_id].isin(valid_customer_id), np.concatenate([_features_columns, [_target]],axis=0)].copy().reset_index(drop=True)

        temp = valid[[_id, _target]].copy()
        temp['fold'] = i

		# modeling#
		train_X = train.drop([_id, _target], axis=1)
		valid_X = valid.drop([_id, _target], axis=1)

		train_Y = np.array(train[_target].astype(np.uint8))
		valid_Y = np.array(valid[_target].astype(np.uint8))

		probas_ = _classifier.fit(train_X, train_Y).predict_proba(valid_X)
		#evals_result = _classifier.evals_result()['validation_0']['auc']

		probabilities = pd.DataFrame(data=probas_[:, 1], index=valid_X.index, columns=[_prob])

		temp = temp.join(probabilities, how='left')
		results_cv_targeting = results_cv_targeting.append(temp)


		###############################################################################
		# Plot probability distribution
		plt.subplot(3,3,1)
		plt.hist(probas_[:, 1], range=(0, 1), bins=100, label="fold %d" % (i), color=colors[i], alpha=0.5)#histtype="step", 


		###############################################################################
		# plot proba distribution for both class
		target_probs = pd.DataFrame(valid_Y, columns=['target'])
		target_probs['probs'] = probas_[:, 1]
		plt.subplot(3, 3, 2)
		plt.hist(target_probs[target_probs['target']==1]['probs'], range=(0, 1), bins=100, 
				 label="fold %d class 1" % (i), color='#abdda4', alpha=0.5)
		plt.hist(target_probs[target_probs['target']==0]['probs'], range=(0, 1), bins=100, 
				 label="fold %d class 0" % (i), color='#d53e4f', alpha=0.5)


		###############################################################################
		# Plot calibration plots
		fraction_of_positives, mean_predicted_value = calibration_curve(valid_Y, probas_[:, 1], n_bins=20)
		plt.subplot(3,3,3)
		plt.plot(mean_predicted_value, fraction_of_positives, "P-", label="fold %d" % (i), lw=1, color=colors[i])


		###############################################################################
		# plot evals_result
		# plt.subplot(3, 3, 4)
		# plt.plot(range(len(evals_result)), evals_result, label='Fold %d' %(i), lw=1, color=colors[i])


		###############################################################################
		# Compute ROC curve and area the curve
		fpr, tpr, thresholds = roc_curve(valid_Y, probas_[:, 1])
		mean_tpr += interp(mean_fpr, fpr, tpr)
		mean_tpr[0] = 0.0
		roc_auc = auc(fpr, tpr)

		plt.subplot(3, 3, 4)
		plt.plot(fpr, tpr, label='Fold %d: %0.2f' % (i, roc_auc), lw=1, color=colors[i])


		###############################################################################
		# Compute Precision-Recall curve and area the curve
		precision, recall, thresholds = precision_recall_curve(valid_Y, probas_[:, 1])
		mean_precision += interp(mean_recall, recall[::-1], precision[::-1])
		pr_auc = auc(recall, precision)

		plt.subplot(3, 3, 5)
		plt.plot(recall, precision, label='Fold %d: %0.2f' % (i, pr_auc), lw=1, color=colors[i])


		###############################################################################
		# calculate lift related information
		cust_rank = temp[[_target, _prob]].copy()
		cust_rank = cust_rank.sort_values(by=_prob, ascending=False).reset_index(drop=True)
		cust_rank['rank'] = cust_rank.index + 1
		cust_rank['num_pos_target'] = np.cumsum(cust_rank[_target])
		pos_rate = temp[_target].mean()

		lift_cums = []
		lift_decays = []
		for q in range(10, 110, 10):
			small_q = (q - 10) / 100.0
			big_q = q / 100.0
			if q == 100:
				lift_cum = cust_rank[_target].mean() / pos_rate
				lift_decay = cust_rank[int(small_q * cust_rank.shape[0]) :][_target].mean() / pos_rate
			else:
				lift_cum = cust_rank[: int(big_q * cust_rank.shape[0])][_target].mean() / pos_rate
				lift_decay = cust_rank[int(small_q * cust_rank.shape[0]) : int(big_q * cust_rank.shape[0])][_target].mean() / pos_rate
			lift_cums.append(lift_cum)
			lift_decays.append(lift_decay)

		print ('shuffle: %i, AUC: %f, lift at 10 percent: %f' % (i, roc_auc, lift_cums[0]))
		mean_lift += np.array(lift_cums)
		mean_lift_decay += np.array(lift_decays)


		###############################################################################
		# calculate number of calls
		nb_calls = cust_rank.copy()
		nb_calls['nb_contacts_100'] = nb_calls.loc[nb_calls.num_pos_target==100,'rank'].min()
		nb_calls['nb_contacts_200'] = nb_calls.loc[nb_calls.num_pos_target==200,'rank'].min()
		nb_calls['nb_contacts_500'] = nb_calls.loc[nb_calls.num_pos_target==500,'rank'].min()
		nb_calls['nb_contacts_1000'] = nb_calls.loc[nb_calls.num_pos_target==1000,'rank'].min()
		nb_calls['nb_contacts_2000'] = nb_calls.loc[nb_calls.num_pos_target==2000,'rank'].min()
		#nb_calls['nb_contacts_3000'] = nb_calls.loc[nb_calls.num_pos_target==3000,'rank'].min()
		nb_calls['nb_contacts_all'] = nb_calls.loc[nb_calls.num_pos_target==nb_calls.num_pos_target.max(),'rank'].min()

		nb_calls = nb_calls[['nb_contacts_100','nb_contacts_200', 'nb_contacts_500','nb_contacts_1000', 
		'nb_contacts_2000','nb_contacts_all']].min() #'nb_contacts_3000',
		nb_calls = pd.DataFrame(nb_calls,columns=['nb_contacts'])
		nb_calls['total_population'] = cust_rank.shape[0]
		nb_calls['total_pos_targets'] = cust_rank[_target].sum()
		nb_calls['nb_pos_targets']=[100,200,500,1000,2000, cust_rank[_target].sum()] #3000,
		nb_calls['pos_rate'] = nb_calls.nb_pos_targets/nb_calls.nb_contacts
		nb_calls['Percentage_of_pos_targets_found'] = nb_calls.nb_pos_targets/nb_calls.total_pos_targets
		nb_calls['Percentage_of_Population'] = nb_calls.nb_contacts/nb_calls.total_population
		nb_calls['Lift'] = nb_calls.Percentage_of_pos_targets_found/nb_calls.Percentage_of_Population

		nb_calls_cv = nb_calls_cv.append(nb_calls)


		###############################################################################
		feature_importances_data = []
		features = train_X.columns
		for feature_name, feature_importance in zip(features,_classifier.feature_importances_):
			feature_importances_data.append({
				'feature': feature_name,
				'importance': feature_importance
			})

		temp = pd.DataFrame(feature_importances_data)
		temp['fold'] = i
		feature_importances = feature_importances.append(temp)
	
	for feature in nb_calls_cv.columns.values:
		nb_calls_cv[feature] = pd.to_numeric(nb_calls_cv[feature], errors='coerce')

	nb_calls_cv = nb_calls_cv.reset_index().groupby('index').mean().sort_values(by='nb_pos_targets')
	results_cv_targeting = results_cv_targeting.reset_index(drop=True)

	feature_importances = feature_importances.groupby('feature')['importance'].agg([np.mean, np.std])
	feature_importances = feature_importances.sort_values(by='mean')
	feature_importances = feature_importances.reset_index()


	# plot probas for probas
	plt.subplot(3, 3, 1)
	plt.ylabel('proba', fontsize=10)
	plt.title('predicted probas', fontsize=12, fontweight="bold")
	#plt.legend(loc="lower right")


	# plot probas for both classes
	plt.subplot(3, 3, 2)
	plt.ylabel('proba', fontsize=10)
	plt.title('predicted probas for different classes', fontsize=12, fontweight="bold")
	#plt.legend(loc="lower right")


	# plot the perfectly calibrated curve
	plt.subplot(3,3,3)
	plt.plot([0, 1], [0, 1], "k--", label="Perfectly calibrated", lw=1, color='grey')
	plt.ylabel("Fraction of positives", fontsize=10)
	plt.xlabel("Mean predicted value", fontsize=10)
	plt.ylim([-0.05, 1.05])
	#plt.legend(loc="lower right")
	plt.title('Calibration plots  (reliability curve)', fontsize=12, fontweight="bold")


	# plot evals_result
	# plt.subplot(3, 3, 4)
	# plt.xlabel('n_estimators', fontsize=10)
	# plt.ylabel('roc_auc', fontsize=10)
	# plt.title('ROC through n_estimators', fontsize=12, fontweight="bold")
	#plt.legend(loc="lower right")

	# plot the averaged ROC curve
	plt.subplot(3, 3, 4)
	mean_tpr /= len(ss)
	mean_tpr[-1] = 1.0
	mean_auc = auc(mean_fpr, mean_tpr)
	plt.plot(mean_fpr, mean_tpr, 'k--', label='Mean ROC: %0.2f' % mean_auc, lw=1, color='grey')
	plt.plot([0, 1], [0, 1], '--', color=(0.6, 0.6, 0.6))
	plt.xlim([-0.05, 1.05])
	plt.ylim([-0.05, 1.05])
	plt.xlabel('False Positive Rate', fontsize=10)
	plt.ylabel('True Positive Rate', fontsize=10)
	plt.title('ROC', fontsize=12, fontweight="bold")
	plt.legend(loc="lower right")


	# plot averaged PR curve
	plt.subplot(3, 3, 5)
	mean_precision /= len(ss)
	mean_pr_auc = auc(mean_recall, mean_precision)
	plt.plot(mean_recall, mean_precision, 'k--', label='Mean PR: %0.2f' % mean_pr_auc, lw=1, color='grey')
	plt.xlabel('Recall', fontsize=10)
	plt.ylabel('Precision', fontsize=10)
	plt.title('Precision-recall', fontsize=12, fontweight="bold")
	plt.legend(loc="lower right")
    
	def autolabel(rects, ax, mark):
		"""
		Attach a text label above each bar displaying its height
		"""
		for rect in rects:
			height = rect.get_height()
			if mark == 'int':
				ax.text(rect.get_x() + rect.get_width()/2., 1.05*height, '%d' % int(height), 
						ha='center', va='bottom', fontsize=10)
			else:
				ax.text(rect.get_x() + rect.get_width()/2., 1.05*height, '%s' % str(round(height, 2)), 
						ha='center', va='bottom', fontsize=10)

	# plot lift cumulative
	ax1 = plt.subplot(3, 3, 6)
	mean_lift /= len(ss)
	rects1 = plt.bar(range(10), mean_lift, color='#abdda4')
	plt.axhline(y=1, color='grey', linestyle='--', lw=1)
	plt.xticks(range(10), ['0-%d' %(num) for num in range(10, 110, 10)], rotation='vertical')
	plt.xlabel('Rank percentage interval', fontsize=10)
	plt.ylabel('lift', fontsize=10)
	plt.title('Lift cumulative plot', fontsize=12, fontweight="bold")
	plt.ylim([ax1.get_ylim()[0], ax1.get_ylim()[1] * 1.2])


	# plot lift decay
	ax2 = plt.subplot(3, 3, 7)
	mean_lift_decay /= len(ss)
	rects2 = plt.bar(range(10), mean_lift_decay, color='#fdae61')
	plt.axhline(y=1, color='grey', linestyle='--', lw=1)
	plt.xticks(range(10), ['%d-%d' %(num-10, num) for num in range(10, 110, 10)], rotation='vertical')
	plt.xlabel('Rank percentage interval', fontsize=10)
	plt.ylabel('lift', fontsize=10)
	plt.title('Lift decay plot', fontsize=12, fontweight="bold")
	plt.ylim([ax2.get_ylim()[0], ax2.get_ylim()[1] * 1.2])


	# plot number of calls
	ax3 = plt.subplot(3, 3, 8)
	rects3 = plt.bar(range(5), nb_calls_cv['nb_contacts'].values[:-1], color='#6baed6')
	plt.xticks(range(5), [100, 200, 500, 1000, 2000], rotation='vertical') #, 3000
	plt.xlabel('Number of target get', fontsize=10)
	plt.ylabel('Number of contacts', fontsize=10)
	plt.title('Number of calls', fontsize=12, fontweight="bold")
	plt.ylim([ax3.get_ylim()[0], ax3.get_ylim()[1] * 1.2])

	autolabel(rects1, ax1, 'float')
	autolabel(rects2, ax2, 'float')
	autolabel(rects3, ax3, 'int')

	fig.subplots_adjust(hspace=.25, wspace=0.25)

	plt.show()
	plt.gcf().clear()


	return results_cv_targeting, feature_importances, nb_calls_cv

"""
function: cross validation function for linear models with customzied outputs
parameters:
_df: pandas DataFrame
dataset for cross validaion
_classifier: object
sk random forest classifier
_features_columns: numpy array
Array of column names used as model features
_id: string
id of each training sample (customer id for example)
_target: string
name of model target
_prob: string
column name for prediction results
_n_iter: int (default 5)
Number of re-shuffling & splitting iterations
_test_size : float (default 0.3)
Between 0.0 and 1.0 and represent the proportion of the dataset to include in the test split
_random_state: int (default 0)
Pseudo-random number generator state used for random sampling
"""

def run_cross_validation_linear(_df, _classifier, _features_columns, _id, _target, _prob,_n_iter=5, _test_size=.3, _random_state=0, _normalized=True):

    # cross validation type can be changed here
    ss = ShuffleSplit(len(_df[_id].unique()), n_iter=_n_iter, test_size=_test_size, random_state=_random_state)

    results_cv_targeting = pd.DataFrame([], columns=[_id, _target, 'fold', _prob])

    mean_tpr = 0.0
    mean_fpr = np.linspace(0, 1, 100)

    mean_precision = 0.0
    mean_recall = np.linspace(0, 1, 100)

    mean_lift = 0.0
    mean_lift_decay = 0.0

    nb_calls_cv = pd.DataFrame([],columns=['nb_contacts', 'total_population', 'total_pos_targets', 'nb_pos_targets', 'pos_rate','Percentage_of_pos_targets_found','Percentage_of_Population', 'Lift'])
    feature_importances = pd.DataFrame([], columns=['feature', 'importance', 'fold'])

    fig = plt.figure(figsize=(6, 12))
    fig.subplots_adjust(bottom=-0.5, left=-0.5, top=0.5, right=1.5)

    print ('modeling started')
    plt.gcf().clear()

    colors = ['#d7191c','#fdae61','#ffffbf','#abdda4','#2b83ba']
    plt.rcParams["font.family"] = "monospace"

    for i, (train_index, valid_index) in enumerate(ss):
        

        customer_id = _df[_id].unique().copy()
        shuffled_customer_id = np.array(sorted(customer_id, key=lambda k: random.random()))
        train_customer_id = shuffled_customer_id[train_index]
        valid_customer_id = shuffled_customer_id[valid_index]

        train = _df.loc[_df[_id].isin(train_customer_id), np.concatenate([_features_columns, [_target]],axis=0)].copy().reset_index(drop=True)
        valid = _df.loc[_df[_id].isin(valid_customer_id), np.concatenate([_features_columns, [_target]],axis=0)].copy().reset_index(drop=True)

        temp = valid[[_id, _target]].copy()
        temp['fold'] = i

        # modeling#
        train_X = train.drop([_id, _target], axis=1)
        valid_X = valid.drop([_id, _target], axis=1)

        if _normalized:

            scaler = StandardScaler().fit(train_X)
            train_X_scaled = scaler.transform(train_X)
            valid_X_scaled = scaler.transform(valid_X)
            train_X = pd.DataFrame(train_X_scaled, index=train_X.index, columns=train_X.columns)
            valid_X = pd.DataFrame(valid_X_scaled, index=valid_X.index, columns=valid_X.columns)

        train_Y = np.array(train[_target].astype(np.uint8))
        valid_Y = np.array(valid[_target].astype(np.uint8))
        
        probas_ = _classifier.fit(train_X, train_Y).predict_proba(valid_X)
        
        probabilities = pd.DataFrame(data=probas_[:, 1], index=valid_X.index, columns=[_prob])

        temp = temp.join(probabilities, how='left')
        results_cv_targeting = results_cv_targeting.append(temp)


        ###############################################################################
        # Plot probability distribution
        plt.subplot(3,3,1)
        plt.hist(probas_[:, 1], range=(0, 1), bins=100, label="fold %d" % (i), color=colors[i], alpha=0.5)#histtype="step", 
        
        
        ###############################################################################
        # plot proba distribution for both class
        target_probs = pd.DataFrame(valid_Y, columns=['target'])
        target_probs['probs'] = probas_[:, 1]
        plt.subplot(3, 3, 2)
        plt.hist(target_probs[target_probs['target']==1]['probs'], range=(0, 1), bins=100, 
                 label="fold %d class 1" % (i), color='#abdda4', alpha=0.5)
        plt.hist(target_probs[target_probs['target']==0]['probs'], range=(0, 1), bins=100, 
                 label="fold %d class 0" % (i), color='#d53e4f', alpha=0.5)


        ###############################################################################
        # Plot calibration plots
        fraction_of_positives, mean_predicted_value = calibration_curve(valid_Y, probas_[:, 1], n_bins=20)
        plt.subplot(3,3,3)
        plt.plot(mean_predicted_value, fraction_of_positives, "P-", label="fold %d" % (i), lw=1, color=colors[i])


        ###############################################################################
        # plot evals_result
        # plt.subplot(3, 3, 4)
        # plt.plot(range(len(evals_result)), evals_result, label='Fold %d' %(i), lw=1, color=colors[i])


        ###############################################################################
        # Compute ROC curve and area the curve
        fpr, tpr, thresholds = roc_curve(valid_Y, probas_[:, 1])
        mean_tpr += interp(mean_fpr, fpr, tpr)
        mean_tpr[0] = 0.0
        roc_auc = auc(fpr, tpr)

        plt.subplot(3, 3, 4)
        plt.plot(fpr, tpr, label='Fold %d: %0.2f' % (i, roc_auc), lw=1, color=colors[i])

        
        ###############################################################################
        # Compute Precision-Recall curve and area the curve
        precision, recall, thresholds = precision_recall_curve(valid_Y, probas_[:, 1])
        mean_precision += interp(mean_recall, recall[::-1], precision[::-1])
        pr_auc = auc(recall, precision)

        plt.subplot(3, 3, 5)
        plt.plot(recall, precision, label='Fold %d: %0.2f' % (i, pr_auc), lw=1, color=colors[i])


        ###############################################################################
        # calculate lift related information
        cust_rank = temp[[_target, _prob]].copy()
        cust_rank = cust_rank.sort_values(by=_prob, ascending=False).reset_index(drop=True)
        cust_rank['rank'] = cust_rank.index + 1
        cust_rank['num_pos_target'] = np.cumsum(cust_rank[_target])
        pos_rate = temp[_target].mean()

        lift_cums = []
        lift_decays = []
        for q in range(10, 110, 10):
            small_q = (q - 10) / 100.0
            big_q = q / 100.0
            if q == 100:
                lift_cum = cust_rank[_target].mean() / pos_rate
                lift_decay = cust_rank[int(small_q * cust_rank.shape[0]) :][_target].mean() / pos_rate
            else:
                lift_cum = cust_rank[: int(big_q * cust_rank.shape[0])][_target].mean() / pos_rate
                lift_decay = cust_rank[int(small_q * cust_rank.shape[0]) : int(big_q * cust_rank.shape[0])][_target].mean() / pos_rate
            lift_cums.append(lift_cum)
            lift_decays.append(lift_decay)

        print ('shuffle: %i, AUC: %f, lift at 10 percent: %f' % (i, roc_auc, lift_cums[0]))
        mean_lift += np.array(lift_cums)
        mean_lift_decay += np.array(lift_decays)


        ###############################################################################
        # calculate number of calls
        nb_calls = cust_rank.copy()
        nb_calls['nb_contacts_100'] = nb_calls.loc[nb_calls.num_pos_target==100,'rank'].min()
        nb_calls['nb_contacts_200'] = nb_calls.loc[nb_calls.num_pos_target==200,'rank'].min()
        nb_calls['nb_contacts_500'] = nb_calls.loc[nb_calls.num_pos_target==500,'rank'].min()
        nb_calls['nb_contacts_1000'] = nb_calls.loc[nb_calls.num_pos_target==1000,'rank'].min()
        nb_calls['nb_contacts_2000'] = nb_calls.loc[nb_calls.num_pos_target==2000,'rank'].min()
        #nb_calls['nb_contacts_3000'] = nb_calls.loc[nb_calls.num_pos_target==3000,'rank'].min()
        nb_calls['nb_contacts_all'] = nb_calls.loc[nb_calls.num_pos_target==nb_calls.num_pos_target.max(),'rank'].min()

        nb_calls = nb_calls[['nb_contacts_100','nb_contacts_200', 'nb_contacts_500','nb_contacts_1000', 
        'nb_contacts_2000','nb_contacts_all']].min() #'nb_contacts_3000',
        nb_calls = pd.DataFrame(nb_calls,columns=['nb_contacts'])
        nb_calls['total_population'] = cust_rank.shape[0]
        nb_calls['total_pos_targets'] = cust_rank[_target].sum()
        nb_calls['nb_pos_targets']=[100,200,500,1000,2000, cust_rank[_target].sum()] #3000,
        nb_calls['pos_rate'] = nb_calls.nb_pos_targets/nb_calls.nb_contacts
        nb_calls['Percentage_of_pos_targets_found'] = nb_calls.nb_pos_targets/nb_calls.total_pos_targets
        nb_calls['Percentage_of_Population'] = nb_calls.nb_contacts/nb_calls.total_population
        nb_calls['Lift'] = nb_calls.Percentage_of_pos_targets_found/nb_calls.Percentage_of_Population

        nb_calls_cv = nb_calls_cv.append(nb_calls)
        
        
        ###############################################################################
        feature_importances_data = []
        features = train_X.columns
        for feature_name, feature_importance in zip(features,_classifier.coef_.ravel()):
            feature_importances_data.append({
                'feature': feature_name,
                'importance': feature_importance
            })

        temp = pd.DataFrame(feature_importances_data)
        temp['fold'] = i
        feature_importances = feature_importances.append(temp)

    for feature in nb_calls_cv.columns.values:
        nb_calls_cv[feature] = pd.to_numeric(nb_calls_cv[feature], errors='coerce')

    nb_calls_cv = nb_calls_cv.reset_index().groupby('index').mean().sort_values(by='nb_pos_targets')
    results_cv_targeting = results_cv_targeting.reset_index(drop=True)

    feature_importances = feature_importances.groupby('feature')['importance'].agg([np.mean, np.std])
    feature_importances = feature_importances.sort_values(by='mean')
    feature_importances = feature_importances.reset_index()

    # plot probas for probas

    plt.subplot(3, 3, 1)
    plt.ylabel('proba', fontsize=10)
    plt.title('predicted probas', fontsize=12, fontweight="bold")
    #plt.legend(loc="lower right")


    # plot probas for both classes
    plt.subplot(3, 3, 2)
    plt.ylabel('proba', fontsize=10)
    plt.title('predicted probas for different classes', fontsize=12, fontweight="bold")
    #plt.legend(loc="lower right")


    # plot the perfectly calibrated curve
    plt.subplot(3,3,3)
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly calibrated", lw=1, color='grey')
    plt.ylabel("Fraction of positives", fontsize=10)
    plt.xlabel("Mean predicted value", fontsize=10)
    plt.ylim([-0.05, 1.05])
    #plt.legend(loc="lower right")
    plt.title('Calibration plots  (reliability curve)', fontsize=12, fontweight="bold")


    # plot evals_result
    # plt.subplot(3, 3, 4)
    # plt.xlabel('n_estimators', fontsize=10)
    # plt.ylabel('roc_auc', fontsize=10)
    # plt.title('ROC through n_estimators', fontsize=12, fontweight="bold")
    #plt.legend(loc="lower right")

    # plot the averaged ROC curve
    plt.subplot(3, 3, 4)
    mean_tpr /= len(ss)
    mean_tpr[-1] = 1.0
    mean_auc = auc(mean_fpr, mean_tpr)
    plt.plot(mean_fpr, mean_tpr, 'k--', label='Mean ROC: %0.2f' % mean_auc, lw=1, color='grey')
    plt.plot([0, 1], [0, 1], '--', color=(0.6, 0.6, 0.6))
    plt.xlim([-0.05, 1.05])
    plt.ylim([-0.05, 1.05])
    plt.xlabel('False Positive Rate', fontsize=10)
    plt.ylabel('True Positive Rate', fontsize=10)
    plt.title('ROC', fontsize=12, fontweight="bold")
    plt.legend(loc="lower right")


    # plot averaged PR curve
    plt.subplot(3, 3, 5)
    mean_precision /= len(ss)
    mean_pr_auc = auc(mean_recall, mean_precision)
    plt.plot(mean_recall, mean_precision, 'k--', label='Mean PR: %0.2f' % mean_pr_auc, lw=1, color='grey')
    plt.xlabel('Recall', fontsize=10)
    plt.ylabel('Precision', fontsize=10)
    plt.title('Precision-recall', fontsize=12, fontweight="bold")
    plt.legend(loc="lower right")

    def autolabel(rects, ax, mark):
        """
        Attach a text label above each bar displaying its height
        """
        for rect in rects:
            height = rect.get_height()
            if mark == 'int':
                ax.text(rect.get_x() + rect.get_width()/2., 1.05*height, '%d' % int(height), 
                        ha='center', va='bottom', fontsize=10)
            else:
                ax.text(rect.get_x() + rect.get_width()/2., 1.05*height, '%s' % str(round(height, 2)), 
                        ha='center', va='bottom', fontsize=10)

    # plot lift cumulative
    ax1 = plt.subplot(3, 3, 6)
    mean_lift /= len(ss)
    rects1 = plt.bar(range(10), mean_lift, color='#abdda4')
    plt.axhline(y=1, color='grey', linestyle='--', lw=1)
    plt.xticks(range(10), ['0-%d' %(num) for num in range(10, 110, 10)], rotation='vertical')
    plt.xlabel('Rank percentage interval', fontsize=10)
    plt.ylabel('lift', fontsize=10)
    plt.title('Lift cumulative plot', fontsize=12, fontweight="bold")
    plt.ylim([ax1.get_ylim()[0], ax1.get_ylim()[1] * 1.2])


    # plot lift decay
    ax2 = plt.subplot(3, 3, 7)
    mean_lift_decay /= len(ss)
    rects2 = plt.bar(range(10), mean_lift_decay, color='#fdae61')
    plt.axhline(y=1, color='grey', linestyle='--', lw=1)
    plt.xticks(range(10), ['%d-%d' %(num-10, num) for num in range(10, 110, 10)], rotation='vertical')
    plt.xlabel('Rank percentage interval', fontsize=10)
    plt.ylabel('lift', fontsize=10)
    plt.title('Lift decay plot', fontsize=12, fontweight="bold")
    plt.ylim([ax2.get_ylim()[0], ax2.get_ylim()[1] * 1.2])


    # plot number of calls
    ax3 = plt.subplot(3, 3, 8)
    rects3 = plt.bar(range(5), nb_calls_cv['nb_contacts'].values[:-1], color='#6baed6')
    plt.xticks(range(5), [100, 200, 500, 1000, 2000], rotation='vertical') #, 3000
    plt.xlabel('Number of target get', fontsize=10)
    plt.ylabel('Number of contacts', fontsize=10)
    plt.title('Number of calls', fontsize=12, fontweight="bold")
    plt.ylim([ax3.get_ylim()[0], ax3.get_ylim()[1] * 1.2])

    autolabel(rects1, ax1, 'float')
    autolabel(rects2, ax2, 'float')
    autolabel(rects3, ax3, 'int')

    fig.subplots_adjust(hspace=.25, wspace=0.25)

    plt.show()
    plt.gcf().clear()


    return results_cv_targeting, feature_importances, nb_calls_cv