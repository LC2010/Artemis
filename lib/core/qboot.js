(function(){

qboot = {
	/**
	 * 轮询执行某个task，直到task返回false或者超过轮询最大次数上限
	 * 如果成功超过轮询上限，执行complete，否则执行abort
	 * @param task 轮询的任务
	 * @param step 轮询间隔，以毫秒为单位
	 * @param max 最大轮询次数
	 * @param complete 超过最大次数，轮询成功
	 * @param abort task返回false，轮询被中断
	 */
	poll : function(task, step, max, complete, abort){
		step = step || 100;
		if(max == null) max = Infinity;		
		if(max <= 0){
			complete && complete();
			return;
		} 

		if(task() !== false){
			setTimeout(function(){
				qboot.poll(task, step, max-1, complete, abort);
			}, step);
		}else{
			abort && abort();
		}
	},
	/**
	 * 等待直到cond条件为true执行success
	 * 如果等待次数超过max，则执行failer
	 * @param cond await条件，返回true则执行success，否则继续等待，直到超过等待次数max，执行failer
	 * @param success await成功
	 * @param failer await失败
	 * @param step 时间间隔
	 * @param max 最大次数
	 */
	await : function(cond, success, failer, step, max){		
		qboot.poll(function(){
			if(cond()){
				success();
				return false;
			}
			return true;
		}, step, max, failer);
	}
};

window.qboot = qboot;
})();