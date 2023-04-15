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
    } catch {
        return false;
    }
}

function findTextAndReturnRemainder(target, variable) {
    const chopFront = target.substring(target.search(variable) + variable.length, target.length);
    const result = chopFront.substring(0, chopFront.search(";"));
    return result;
}

async function getWebtoonImgScript(link) {
    link = `${base}/${link}.html`;
    const html = await axios.get(link).then(res => res.data);
    const $ = cheerio.load(html);
    const text = $($('script')).text();
    const findAndClean = findTextAndReturnRemainder(text, "var toon_img =");
    const result = replaceAll(replaceAll(findAndClean, "'", ''), ' ', '');
    return result;
}

app.get('/api/popular', async function (req, res) {
    return res.json(await getPopularWebtoons());
});

app.post('/api/script', async function (req, res) {
    const obj = {
        script: await getWebtoonImgScript(req.body.link),
        base
    }
    return res.json(obj);
});

app.post('/api/episode', async function (req, res) {
    return res.json(await getAllEpisode(req.body.title));
});

app.get('/', async function (req, res) {
    return res.render('index.ejs');
});

app.get('/episode/:title', async function (req, res) {
    const title = req.params.title;
    let thumb = req.query.thumb;
    if (thumb.includes("0x1")) {
        thumb = thumb.split('_');
        thumb.splice(thumb.length - 1);
        thumb = thumb.join('_').replace('thumb-', '') + '.jpg';
    }
    return res.render('episode.ejs', {
        title, thumb
    });
});

app.get('/episode/view/:link', async function (req, res) {
    const title = req.query.title;
    const link = req.params.link;
    const thumb = req.query.thumb;
    const origin = replaceAll(req.params.link, '_', ' ');

    const episode = await getAllEpisode(title);
    const findIdx = episode.findIndex(x => x.repl === link);
    const prev = episode.length - 1 == findIdx ? false : `/episode/view/${episode[episode.findIndex(x => x.repl === link) + 1].repl}?title=${title}`;
    const next = findIdx == 0 ? false : `/episode/view/${episode[episode.findIndex(x => x.repl === link) - 1].repl}?title=${title}`;

    return res.render('view.ejs', {
        link, title, prev, next, origin, thumb
    })
});

app.listen(port, function () { console.log(`listening on ${port}`) });