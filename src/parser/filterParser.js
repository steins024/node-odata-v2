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
  },
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

export default (query, $filter) => new Promise((resolve, reject) => {
  if (!$filter) {
    return resolve();
  }
  
  console.log('filter parsing...');
  let conditions = split($filter, ['and', 'or']);
  let andArray = [];
  let orArray = [];
  console.log('conditions:', conditions);
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
          console.log(`Syntax error at '${conditions[index]}'.`);
          return reject(`Syntax error at '${conditions[index]}'.`);
        }
      }
    }
  }
  console.log('and array:', andArray);
  console.log('or array:', orArray);
  
  
  const condition = split($filter, ['and', 'or'])
    .filter((item) => (item !== 'and' && item !== 'or')); 
  
  condition.map((item) => {
    // parse "indexof(title,'X1ML') gt 0"
    const conditionArr = split(item, OPERATORS_KEYS);
    if (conditionArr.length === 0) {
      // parse "contains(title,'X1ML')"
      conditionArr.push(item);
    }
    if (conditionArr.length !== 3 && conditionArr.length !== 1) {
      return reject(`Syntax error at '${item}'.`);
    }
    const [key, odataOperator, value] = conditionArr;

    let val = undefined;
    if (value !== undefined) {
      const result = validator.formatValue(value);
      if (result.err) {
        return reject(result.err);
      }
      val = result.val;
    }

    // function query
    const functionKey = key.substring(0, key.indexOf('('));
    if (['indexof', 'year', 'contains'].indexOf(functionKey) > -1) {
      functions[functionKey](query, key, odataOperator, val);
    } else {
      if (conditionArr.length === 1) {
        return reject(`Syntax error at '${item}'.`);
      }
      if (value === 'null') {
        switch (odataOperator) {
          case 'eq':
            query.exists(key, false);
            return resolve();
          case 'ne':
            query.exists(key, true);
            return resolve();
          default:
            break;
        }
      }
      // operator query
      switch (odataOperator) {
        case 'eq':
          query.where(key).equals(val);
          break;
        case 'ne':
          query.where(key).ne(val);
          break;
        case 'gt':
          query.where(key).gt(val);
          break;
        case 'ge':
          query.where(key).gte(val);
          break;
        case 'lt':
          query.where(key).lt(val);
          break;
        case 'le':
          query.where(key).lte(val);
          break;
        default:
          return reject("Incorrect operator at '#{item}'.");
      }
    }
  });
  resolve();
});