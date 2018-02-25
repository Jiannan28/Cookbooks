import numpy as np
import pandas as pd
import xgboost as xgb
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier

import warnings
warnings.filterwarnings('ignore')

def get_importance(_bst, _importance_type):
    # if it's weight, then omap stores the number of missing values
    fmap = ''
    if _importance_type == 'weight':
        # do a simpler tree dump to save time
        trees = _bst.get_dump(fmap, with_stats=False)

        fmap = {}
        for tree in trees:
            for line in tree.split('\n'):
                # look for the opening square bracket
                arr = line.split('[')
                # if no opening bracket (leaf node), ignore this line
                if len(arr) == 1:
                    continue

                # extract feature name from string between []
                fid = arr[1].split(']')[0].split('<')[0]

                if fid not in fmap:
                    # if the feature hasn't been seen yet
                    fmap[fid] = 1
                else:
                    fmap[fid] += 1

        return fmap

    else:
        trees = _bst.get_dump(fmap, with_stats=True)

        _importance_type += '='
        fmap = {}
        gmap = {}
        for tree in trees:
            for line in tree.split('\n'):
                # look for the opening square bracket
                arr = line.split('[')
                # if no opening bracket (leaf node), ignore this line
                if len(arr) == 1:
                    continue

                # look for the closing bracket, extract only info within that bracket
                fid = arr[1].split(']')

                # extract gain or cover from string after closing bracket
                g = float(fid[1].split(_importance_type)[1].split(',')[0])

                # extract feature name from string before closing bracket
                fid = fid[0].split('<')[0]

                if fid not in fmap:
                    # if the feature hasn't been seen yet
                    fmap[fid] = 1
                    gmap[fid] = g
                else:
                    fmap[fid] += 1
                    gmap[fid] += g

        # calculate average value (gain/cover) for each feature
        for fid in gmap:
            gmap[fid] = gmap[fid] / fmap[fid]

        return gmap

"""
function: display feature importance in a barplot
parameters:
_feat_df: pandas DataFrame
dataset contains feature importance calculated from Tree based models
_classifier: xgboost classifier
xgboost classifier
_features_columns: numpy array
Array of column names used as model features
"""

def feat_imp_xval_plot(_feat_df):

	_feat_df['abs_imp'] = _feat_df['mean'].apply(lambda x: abs(x))
	feature_importances_sort = _feat_df.sort_values(by='abs_imp',ascending=False)
	feature_importances_sort['relative_imp'] = 100.0 * (feature_importances_sort['abs_imp'] / feature_importances_sort['abs_imp'].max())
	feature_importances_sort = feature_importances_sort[::-1].reset_index(drop=True)
	#feature_importances_sort = feature_importances_sort.tail(20).reset_index(drop=True)
	
	plt.figure(figsize=(8, 12))
	plt.title("Feature importances for Model")
	plt.barh(feature_importances_sort.index, feature_importances_sort['relative_imp'], color='#348ABD', align="center", lw='3', edgecolor='#348ABD', alpha=0.6)
	plt.yticks(feature_importances_sort.index, feature_importances_sort['feature'], fontsize=8,)

	plt.ylim([-1, feature_importances_sort.index.max()+1])
	plt.xlim([0, feature_importances_sort['relative_imp'].max()*1.1])

	plt.show()
	
	return feature_importances_sort


"""
function: compute feature importance for xgboost and display
parameters:
_clf: object
trained xgboost model
_feat_cols: list
list of feature names in model building dataset
"""

def feat_imp_xgb(_clf, _feat_cols):

	feature_importances_data = []
	features = _feat_cols
	for feature_name, feature_importance in get_importance(_clf.booster(), 'gain').iteritems():
		feature_importances_data.append({
		   'feature': feature_name,
		   'importance': feature_importance
		})
	feature_importances = pd.DataFrame(feature_importances_data)
	feature_importances.columns = ['feature','mean']
	feature_importances_sort = feat_imp_xval_plot(feature_importances)
	return feature_importances_sort
	

"""
function: compute sk-learn tree-based model feature importance and display
parameters:
_clf: object
trained sk-learn tree-based model
_feat_cols: list
list of feature names in model building dataset
"""

def feat_imp_trees(_clf, _feat_cols):

	feature_importances_data = []
	features = _feat_cols
	for feature_name, feature_importance in zip(features,_clf.feature_importances_):
		feature_importances_data.append({
		   'feature': feature_name,
		   'importance': feature_importance
		})
    
	feature_importances = pd.DataFrame(feature_importances_data)
	feature_importances.columns = ['feature','mean']
	feature_importances_sort = feat_imp_xval_plot(feature_importances)
	return feature_importances_sort
	

"""
function: compute sk-learn logistic regression models feature importance and display
parameters:
_clf: object
trained sk-learn tree-based model
_feat_cols: list
list of feature names in model building dataset
"""

def feat_imp_linear(_clf, _feat_cols):

	feature_importances_data = []
	features = _feat_cols
	for feature_name, feature_importance in zip(features,_clf.coef_.ravel()):
		feature_importances_data.append({
		   'feature': feature_name,
		   'importance': feature_importance
		})
    
	feature_importances = pd.DataFrame(feature_importances_data)
	feature_importances.columns = ['feature','mean']
	feature_importances_sort = feat_imp_xval_plot(feature_importances)
	return feature_importances_sort
	
