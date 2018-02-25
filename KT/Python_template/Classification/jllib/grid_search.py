import numpy as np
import pandas as pd
from sklearn.grid_search import GridSearchCV
from sklearn.metrics import roc_auc_score,accuracy_score,average_precision_score,roc_curve,auc
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

"""
function: grid search function for tree-based models
parameters:
_gs_estimator: object
sk-learn gridserach object 
_train: pandas dataframe
train dataset
_test: pandas dataframe
test dataset
"""
def grid_search_trees(_gs_estimator, _train, _test, _ID, _TARGET, _PRED_PROBA):
	
	X_train = _train.drop([_ID,_TARGET],axis=1)
	X_test = _test.drop([_ID,_TARGET],axis=1)
	
	results_test = _test[[_ID,_TARGET]].copy()
	
	y_train = np.array(_train[_TARGET].astype(np.uint8))
	
	print("Start training with Grid Search") 
	
	_gs_estimator.fit(X_train, y_train)
	
	print("Best parameters set found on development set:\n")
	print(_gs_estimator.best_estimator_)
	
	print("\n Grid scores on development set:")
	for params, mean_score, scores in _gs_estimator.grid_scores_:
		print("%0.3f (+/-%0.03f) for %r" % (mean_score, scores.std() / 2, params))
	
	y_test = np.array(_test[_TARGET].astype(np.uint8))
	y_true, y_pred = y_test, _gs_estimator.predict_proba(X_test)
	
	print("Scores on the evaluation dataset")
	print("ROC AUC SCORE\t:\t" + str(roc_auc_score(y_true, y_pred[:,1])))
	print("ACCURACY SCORE\t:\t" + str(accuracy_score(y_true, _gs_estimator.predict(X_test))))
	print("PRECISION SCORE\t:\t" + str(average_precision_score(y_true, y_pred[:,1])))
	
	proba = y_pred[:,1]
	proba_df = pd.DataFrame(data=proba,index=_test.index,columns=[_PRED_PROBA])
	results_test = pd.concat([results_test,proba_df],axis=1)
	
	results_lift=pd.DataFrame(range(0,101), columns=['quantiles'])
	
	# Compute ROC curve and area the curve
	fpr, tpr, thresholds = roc_curve(results_test[_TARGET], results_test[_PRED_PROBA])
	roc_auc = auc(fpr, tpr)
	
	# Compute Lift curve
	sorted_proba = np.array(list(reversed(np.argsort(results_test[_PRED_PROBA].values))))
	xtestshape0 = results_test[_TARGET].count().astype(int)
	y_test_l = results_test[_TARGET]
	centile = xtestshape0//100
	positives = sum(y_test_l)
	lift = [0]
	for q in xrange(1,101):
		if q == 100:
			tp = sum(np.array(y_test_l)[sorted_proba[(q-1)*centile:xtestshape0]])
		else:
			tp = sum(np.array(y_test_l)[sorted_proba[(q-1)*centile:q*centile]])
		lift.append(lift[q-1]+100*tp/float(positives))
	quantiles = range(0,101)
	results_lift['lift_%s' %(_TARGET)]=lift
	results_lift['lift_10_%s' %(_TARGET)]=lift[10]/10.
	
	print("Model auc: %f, lift at 10: %f" %(roc_auc, lift[10]/10.))
	
	return _gs_estimator, results_test
	
	
"""
function: grid search function for linear models
parameters:
_gs_estimator: object
sk-learn gridserach object 
_train: pandas dataframe
train dataset
_test: pandas dataframe
test dataset
_normalized: boolean
normalize features before building models
"""
def grid_search_linear(_gs_estimator, _train, _test, _ID, _TARGET, _PRED_PROBA, _normalized=True):
	
	X_train = _train.drop([_ID,_TARGET],axis=1)
	X_test = _test.drop([_ID,_TARGET],axis=1)
	
	if _normalized:
		print("Normalizing numerical variables")
		# Define scaler from train dataset
		scaler = StandardScaler().fit(X_train)
		
		X_train_scaled = scaler.transform(X_train)
		X_test_scaled = scaler.transform(X_test)
		
		X_train =pd.DataFrame(X_train_scaled, index=X_train.index, columns=X_train.columns)
		X_test = pd.DataFrame(X_test_scaled, index=X_test.index, columns=X_test.columns)
	
	results_test = _test[[_ID,_TARGET]].copy()
	
	y_train = np.array(_train[_TARGET].astype(np.uint8))
	
	print("Start training with Grid Search") 
	
	_gs_estimator.fit(X_train, y_train)
	
	print("Best parameters set found on development set:\n")
	print(_gs_estimator.best_estimator_)
	
	print("\n Grid scores on development set:")
	for params, mean_score, scores in _gs_estimator.grid_scores_:
		print("%0.3f (+/-%0.03f) for %r" % (mean_score, scores.std() / 2, params))
	
	y_test = np.array(_test[_TARGET].astype(np.uint8))
	y_true, y_pred = y_test, _gs_estimator.predict_proba(X_test)
	
	print("Scores on the evaluation dataset")
	print("ROC AUC SCORE\t:\t" + str(roc_auc_score(y_true, y_pred[:,1])))
	print("ACCURACY SCORE\t:\t" + str(accuracy_score(y_true, _gs_estimator.predict(X_test))))
	print("PRECISION SCORE\t:\t" + str(average_precision_score(y_true, y_pred[:,1])))
	
	proba = y_pred[:,1]
	proba_df = pd.DataFrame(data=proba,index=_test.index,columns=[_PRED_PROBA])
	results_test = pd.concat([results_test,proba_df],axis=1)
	
	results_lift=pd.DataFrame(range(0,101), columns=['quantiles'])
	
	# Compute ROC curve and area the curve
	fpr, tpr, thresholds = roc_curve(results_test[_TARGET], results_test[_PRED_PROBA])
	roc_auc = auc(fpr, tpr)
	
	# Compute Lift curve
	sorted_proba = np.array(list(reversed(np.argsort(results_test[_PRED_PROBA].values))))
	xtestshape0 = results_test[_TARGET].count().astype(int)
	y_test_l = results_test[_TARGET]
	centile = xtestshape0//100
	positives = sum(y_test_l)
	lift = [0]
	for q in xrange(1,101):
		if q == 100:
			tp = sum(np.array(y_test_l)[sorted_proba[(q-1)*centile:xtestshape0]])
		else:
			tp = sum(np.array(y_test_l)[sorted_proba[(q-1)*centile:q*centile]])
		lift.append(lift[q-1]+100*tp/float(positives))
	quantiles = range(0,101)
	results_lift['lift_%s' %(_TARGET)]=lift
	results_lift['lift_10_%s' %(_TARGET)]=lift[10]/10.
	
	print("Model auc: %f, lift at 10: %f" %(roc_auc, lift[10]/10.))
	
	return _gs_estimator, results_test
	
	
	
	
	
	
	
	
	