"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var task_1 = require("./task");
var cognitive_load_model_1 = require("./cognitive_load_model");
var task = new task_1.Task('My Task', 'This is a very long description that needs to be broken down into smaller tasks.', new Date());
task.breakDownTask();
var cognitiveLoadModel = new cognitive_load_model_1.default();
cognitiveLoadModel.compile();
