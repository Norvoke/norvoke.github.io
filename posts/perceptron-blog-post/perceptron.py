import numpy as np

class Perceptron:
    def __init__(self):
        # Constructor method, no variables initialized
        pass


    def fit(self,
            X,
            y,
            max_steps = 1000):
        """
        Finn Ellingwood's Perceptron with tools from Numpy and Prof. Chodrow's Blogpost write-up.
        First, initializes a random initial weight vector, then picks a random index i,
        which computes the training until termination.
        
        Parameters:
            X: A matrix of predictor variables. There are n observations with p features.
            y: a vector with two possible labels, 1 or 0
            max_steps: maximum number of loops going through, with a default of 1000
        
        Returns:
            Nothing
        """
        
        # Initialize w, history, and X~ variables:
        X_ = np.append(X,
                       np.ones((X.shape[0], 1)),
                       1) # Initialize X_ by appending 1 at the end of X
                          # This was given as a hint in the instructions
        self.w = np.random.rand(X_.shape[1]) # Initializes a random weight vector as w
        self.history = [] # Initializes history vector as empty
        
        # A for loop to perform the perceptron update and log the score in self.history
        for _ in range(max_steps):
            i = np.random.randint(X_.shape[0]) # picks a random index i within the number of observations
            
            y_ = 2*y-1 # Makes the y~ variable used for the validation test by shifting 0 and 1 to -1 and 1

            # Finally updates w and adds score value to history
            self.w = self.w + np.where((y_[i]*self.validation(X_[i])) < 0, 1, 0)*y_[i]*X_[i] # updates w
            self.history.append(self.score(X, y))

    def score(self, X, y):
        """
        Returns the accuracy of the perceptron as a number between 0 and 1,
        with 1 corresponding to perfect classification using validation()
        to score it.
        """
        y_ = 2*y-1 # The same prediction labels used in fit()
        X_ = np.append(X, np.ones((X.shape[0], 1)), 1)
        return np.dot(self.validation(X_),y_)/X_.shape[0]
    
    def predict(self, X):
        """
        Returns a vector as model’s predictions for the labels on the data using
        the dot product of vectors X and w.
        
        Returns 0 if < 0
        Returns 1 if > 0
        """
        return (np.sign(np.dot(X, self.w))+1)//2
    
    def validation(self, X):
        """
        Return a list of vector showing whether the dot product of w and X is greater than
        
        Returns -1 if < 0
        Returns 1 if > 0
        """
        return np.sign(np.dot(X, self.w))
        
            
        
        