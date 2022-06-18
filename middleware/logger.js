//Description: Logs request to console
const logger = (req, res, next) =>{
    //req.hello = 'Hello there';
    console.log(`${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl}`);
    next(); // needed for every middleware, so app can move onto the next middleware in the cycle
};

module.exports = logger;