# Linear Regression

Linear regression models the relationship between input features and a continuous target.

The model is \(y = wx + b\). We choose parameters to minimize squared error on training data.

# Loss Functions

A loss function measures how wrong predictions are. Mean squared error averages squared differences between predictions and targets.

Lower loss means better fit, but very low training loss can signal overfitting.

# Gradient Descent

Gradient descent updates parameters in the direction that reduces loss.

The update rule is \(\theta_{t+1} = \theta_t - \eta \nabla J(\theta_t)\), where \(\eta\) is the learning rate.

Use a small learning rate for stability and a larger one for faster convergence when safe.

# Overfitting

Overfitting happens when a model fits training noise instead of the underlying pattern.

Signs include high training accuracy but poor validation performance.

# Regularization

Regularization adds a penalty for large weights. L2 regularization discourages extreme parameter values and often improves generalization.

Combine regularization with cross-validation to choose the penalty strength.
