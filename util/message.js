const moment=require('moment');
let generateMessage=(from,text)=>{
  return{
    from,
    text,
    date: moment().valueOf()
  };
};

module.exports = {generateMessage};
