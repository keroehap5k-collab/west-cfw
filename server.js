const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

const app = express();
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- إعدادات الديسكورد (ضع بياناتك هنا) ---
const CLIENT_ID = '1474858135591194729';
const CLIENT_SECRET = '-eBQyL5gEOKatcVJaPC-B9A3qI9p3Btb';
const CALLBACK_URL = 'http://localhost:3000/auth/discord/callback';

// مخزن العروض (Database مؤقتة في الذاكرة)
let offers = [];

passport.use(new DiscordStrategy({
    clientID: CLIENT_ID, clientSecret: CLIENT_SECRET,
    callbackURL: CALLBACK_URL, scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(session({ secret: 'west-secret-key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// --- نظام الحذف التلقائي بعد 4 أيام ---
setInterval(() => {
    const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    offers = offers.filter(offer => (now - offer.createdAt) < fourDaysInMs);
}, 3600000); // يفحص كل ساعة

// --- المسارات ---
app.get('/', (req, res) => {
    res.render('index', { user: req.user, offers: offers });
});

app.post('/add-offer', (req, res) => {
    if (!req.user) return res.status(401).send('يجب تسجيل الدخول');
    const newOffer = {
        id: Date.now().toString(),
        userId: req.user.id,
        username: req.user.username,
        itemName: req.body.itemName,
        itemPrice: req.body.itemPrice,
        createdAt: Date.now()
    };
    offers.push(newOffer);
    res.json(newOffer);
});

app.post('/delete-offer', (req, res) => {
    if (!req.user) return res.sendStatus(401);
    const { id } = req.body;
    offers = offers.filter(o => !(o.id === id && o.userId === req.user.id));
    res.sendStatus(200);
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

app.listen(3000, () => console.log('✅ WEST Server is running on http://localhost:3000'));