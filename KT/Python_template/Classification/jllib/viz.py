import matplotlib.pyplot as plt
import seaborn as sns

import warnings
warnings.filterwarnings('ignore')

def plot_dist(col):
	plt.hist(col, range=(0, 1), bins=100, label="proba distribution", histtype="step", lw=2)
	plt.xlabel("Mean predicted value")
	plt.ylabel("Count")
	plt.title('Proba distribution')
	plt.grid(True)
	
	plt.show()