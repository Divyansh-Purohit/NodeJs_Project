module.exports = (req, res, next) => {
    if(!req.session.isLogeedIn) {
        return res.redirect('/login');
    }
    next();
};