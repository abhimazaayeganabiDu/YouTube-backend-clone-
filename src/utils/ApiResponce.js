class ApiResponce {
    constructor(staausCode, message = "success",data){
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = success;
        this.success = staausCode < 400;
        
    }
}

export {ApiResponce}