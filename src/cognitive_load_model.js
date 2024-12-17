"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import necessary libraries
var tf = require("@tensorflow/tfjs");
// Define the cognitive load model
var CognitiveLoadModel = /** @class */ (function () {
    function CognitiveLoadModel() {
        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 10, activation: 'relu', inputShape: [10] }));
        this.model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
    }
    // Compile the model
    CognitiveLoadModel.prototype.compile = function () {
        this.model.compile({ optimizer: tf.train.adam(), loss: 'meanSquaredError' });
    };
    // Train the model
    CognitiveLoadModel.prototype.train = function (data) {
        this.model.fit(data.inputs, data.labels, { epochs: 100 });
    };
    // Make predictions
    CognitiveLoadModel.prototype.predict = function (inputs) {
        return this.model.predict(inputs);
    };
    return CognitiveLoadModel;
}());
// Export the cognitive load model
exports.default = CognitiveLoadModel;
