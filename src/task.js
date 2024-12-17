"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubTask = exports.Task = void 0;
var Task = /** @class */ (function () {
    function Task(title, description, dueDate) {
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
    }
    Task.prototype.breakDownTask = function () {
        // Implement task breakdown logic here
        var subTasks = [];
        // Recursive function to break down tasks
        function breakDown(task) {
            if (task.description.length > 100) {
                var subTask1 = new SubTask(task.title + ' - Part 1', task.description.substring(0, 100), task.dueDate);
                var subTask2 = new SubTask(task.title + ' - Part 2', task.description.substring(100), task.dueDate);
                subTasks.push(subTask1);
                subTasks.push(subTask2);
                breakDown(subTask1);
                breakDown(subTask2);
            }
        }
        breakDown(this);
        console.log(subTasks);
    };
    return Task;
}());
exports.Task = Task;
var SubTask = /** @class */ (function (_super) {
    __extends(SubTask, _super);
    function SubTask(title, description, dueDate) {
        return _super.call(this, title, description, dueDate) || this;
    }
    return SubTask;
}(Task));
exports.SubTask = SubTask;
