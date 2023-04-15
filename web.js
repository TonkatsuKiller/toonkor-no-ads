const express = require('express');
const session = require('express-session');

const axios = require('axios');
const cheerio = require('cheerio');

const port = 8005;
const app = express();
let base = "https://toonkor203.com";

// ======================================

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

app.use(express.static(`${__dirname}/public`));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

function replaceAll(str, searchStr, replaceStr) {
    return str.split(searchStr).join(replaceStr);
}

async function getPopularWebtoons() {
    let returnData = [];
    const className = ".section-item";
    const uri = base + "/%EC%9B%B9%ED%88%B0?fil=%EC%9D%B8%EA%B8%B0";
    const html = await axios.get(uri).then(res => res.data);
    const $ = cheerio.load(html);
    $(className).each(function (idx, elem) {
        returnData.push({
            title: $(elem).find('#title').text().trim(),
            thumb: base + ($(elem).find('img').attr('data-src') == undefined ? $(elem).find('img').attr('src') : $(elem).find('img').attr('data-src'))
        });
    });
    return returnData.slice(0, 99);
}

async function getAllEpisode(title) {
    let returnData = [];
    try {
        const html = await axios.get(`${base}/${title}`).then(res => res.data);
        const $ = cheerio.load(html);
        $('#bo_list').find('.content__title').each(function (idx, elem) {
            const origin = $(elem).text().trim();
            const repl = replaceAll(origin, ' ', '_');
            returnData.push({ origin, repl });
        });
        return returnData;
    }catch {
        return false;
    }
}

app.get('/api/popular', async function (req, res) {
    return res.json(await getPopularWebtoons());
});

app.post('/api/episode', async function (req, res) {
    return res.json(await getAllEpisode(req.body.title));
});

app.get('/', async function (req, res) {
    return res.render('index.ejs');
});

app.get('/episode/:title', async function (req, res) {
    const title = req.params.title;
    console.log(req.query.thumb)
    let thumb = String(req.query.thumb).split('_');
    thumb.splice(thumb.length - 1);
    thumb = thumb.join('_').replace('thumb-', '') + '.jpg';
    console.log(thumb);
    return res.render('episode.ejs', {
        title, thumb
    });
});

app.listen(port, function () {console.log(`listening on ${port}`)});