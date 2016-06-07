// Operator  Description             Example
// Comparison Operators
// eq        Equal                   Address/City eq 'Redmond'
// ne        Not equal               Address/City ne 'London'
// gt        Greater than            Price gt 20
// ge        Greater than or equal   Price ge 10
// lt        Less than               Price lt 20
// le        Less than or equal      Price le 100
// has       Has flags               Style has Sales.Color'Yellow'    #todo
// Logical Operators
// and       Logical and             Price le 200 and Price gt 3.5
// or        Logical or              Price le 3.5 or Price gt 200     #todo
// not       Logical negation        not endswith(Description,'milk') #todo

// eg.
//   http://host/service/Products?$filter=Price lt 10.00
//   http://host/service/Categories?$filter=Products/$count lt 10

import _ from 'lodash';
import functions from './functionsParser';
import { split } from '../utils';

const OPERATORS_KEYS = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'has'];

const stringHelper = {
  has: (str, key) => str.indexOf(key) >= 0,

  isBeginWith: (str, key) => str.indexOf(key) === 0,

  isEndWith: (str, key) => str.lastIndexOf(key) === (str.length - key.length),

  removeEndOf: (str, key) => {
    if (stringHelper.isEndWith(str, key)) {
      return str.substr(0, str.length - key.length);
    }
    return str;
  }
};

const validator = {
  formatValue: (value) => {
    let val = undefined;
    if (value === 'true') {
      val = true;
    } else if (value === 'false') {
      val = false;
    } else if (+value === +value) {
      val = +value;
    } else if (stringHelper.isBeginWith(value, "'") && stringHelper.isEndWith(value, "'")) {
      val = value.slice(1, -1);
    } else if (value === 'null') {
      val = value;
    } else {
      return ({ err: `Syntax error at '${value}'.` });
    }
    return ({ val });
  }
};

function parseFilterCondition(condition) {
  // parse "indexof(title,'X1ML') gt 0"
    const conditionArr = split(condition, OPERATORS_KEYS);
    if (conditionArr.length === 0) {
      // parse "contains(title,'X1ML')"
      console.log('========unreachable????==========');
      conditionArr.push(condition);
    }
    if (conditionArr.length !== 3 && conditionArr.length !== 1) {
      let err = `Syntax error at '${condition}'.`;
      console.err(err);
      throw err;
    }
    const [key, odataOperator, value] = conditionArr;

    let val = undefined;
    if (value !== undefined) {
      const result = validator.formatValue(value);
      if (result.err) {
        console.err(result.err);
        throw result.err;
      }
      val = result.val;
    }
    
    return [key, odataOperator, val];
}

function populateAndCondition(findObj, key, odataOperator, val) {
  switch (odataOperator) {
    case 'eq':
      if(findObj[key] && findObj[key].$in){
        let err = `Syntax error, already have 'in' filter on '${key}'`;
        console.err(err);
        throw err;
      } else {
        _.set(findObj, key + '.$in', [val]);
      }
      break;
    case 'gt':
      if(findObj[key] && findObj[key].$gt){
        let err = `Syntax error, already have 'gt' filter on '${key}'`;
        console.err(err);
        throw err;
      } else {
        _.set(findObj, key + '.$gt', val);
      }
      break;
    case 'lt':
      if(findObj[key] && findObj[key].$lt){
        let err = `Syntax error, already have 'lt' filter on '${key}'`;
        console.err(err);
        throw err;
      } else {
        _.set(findObj, key + '.$lt', val);
      }
      break;
    default:
      let err = `Incorrect operator at '${key}', may be not available currently.`;
      console.err(err);
      throw err;
  }
}

function populateOrCondition(findObj, key, odataOperator, val) {
  switch (odataOperator) {
    case 'eq':
      if(!findObj[key] || !findObj[key].$in){
        _.set(findObj, key + '.$in', []);
      }
      findObj[key].$in.push(val);
      break;
    default:
      let err = `Incorrect operator at '${key}', may be not available currently.`;
      console.err(err);
      throw err;
  }
}

export default (model, $filter) => {
  if (!$filter) {
    return model.find();;
  }  
  console.log('filter parsing...');
  let conditions = split($filter, ['and', 'or']);
  let andArray = [];
  let orArray = [];
  //have $filter
  if (conditions.length !== 0) {
    //get the first condition
    andArray.push(conditions.shift());
    //if got more conditions (and/or)
    if(conditions.length !== 0){
      for (let index = 0; index < conditions.length; index +=2) {
        if (conditions[index] === 'and' && conditions[index + 1]) {
          andArray.push(conditions[index + 1]);
        } else if (conditions[index] === 'or'&& conditions[index + 1]) {
          orArray.push(conditions[index + 1]);
        } else {
          let err = `Syntax error at '${conditions[index]}'.`;
          console.err(err);
          throw err;
        }
      }
    }
  }

  let findObj = {};
  andArray.map((item) => {
    const [key, odataOperator, val] = parseFilterCondition(item);
    //currently not support function (contains, indexof ...) in filter
    populateAndCondition(findObj, key, odataOperator, val);
  });
  orArray.map((item) => {
    const [key, odataOperator, val] = parseFilterCondition(item);
    populateOrCondition(findObj, key, odataOperator, val);
  });
  return model.find(findObj);
}