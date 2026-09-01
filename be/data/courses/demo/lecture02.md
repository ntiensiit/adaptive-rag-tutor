# Gradient Descent Intuition

Think of loss as a landscape and parameters as your position. The negative gradient points downhill.

Each step moves parameters toward a local minimum. Learning rate controls step size.

# Worked Example

For \(f(x) = x^2\), the derivative is \(2x\). Starting at \(x=3\) with \(\eta=0.1\):

- Step 1: \(x = 3 - 0.1 \cdot 6 = 2.4\)
- Step 2: \(x = 2.4 - 0.1 \cdot 4.8 = 1.92\)

Values move toward zero, the minimum.

# Practice Guidance

When tutoring, ask what the gradient represents before giving the update formula.

Link gradient descent back to linear regression by minimizing MSE.
