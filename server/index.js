'use strict'

var express = require('express')
var db = require('../db')
var helpers = require('./helpers')

var slug = require('slug')
var bodyParser = require('body-parser')

module.exports = express()
  .set('view engine', 'ejs')
  .set('views', 'view')
  .use(express.static('static'))
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .use('/image', express.static('db/image'))
  // TODO: Serve the images in `db/image` on `/image`.
  .get('/add', renderForm)
  .get('/', all)
  /* TODO: Other HTTP methods. */
  .post('/', add)
  .delete('/:id', remove)
  .get('/:id', get)
  // .put('/:id', set)
  // .patch('/:id', change)
  .listen(1902)

function all(req, res) {
  var result = {
    errors: [],
    data: db.all()
  }

  /* Use the following to support just HTML:  */
  res.render('list.ejs', Object.assign({}, result, helpers))
}

// Hier maak ik een functie get aan die bovenin de code met id wordt gelinkt
// functie om paden mogelijk te maken, opvraag van een pad
// link met .json, is in dit geval de database
function get(req, res) {
  // Var id = req.params('id') = alle projecten die uit de url zijn gekomen worden in de var gestopt door req.param te gebruiken
  // params verwijst naar de parameters, in dit geval /:id, en verwijst uiteindelijk naar de id's in dat json bestand,
  // en het maakt paden uberhaupt mogelijk
  var id = req.params.id
  var has

  try {
    // Als er een bestand is gevonden, dan wordt het goed gekeurd en wordt er geen error gegeven
    // Has heeft titus gemaakt en dat boeit niet, hij komt uit index.js van db
    if (db.has(id)) {
      // Hier krijg je data van de db = database. In dit geval vragen we niet alles op, maar alleen de id uit de functie get
      // db.get = get is de functie
      var result = {
        errors: [],
        data: db.get(id)
      }
      // Hier krijg je toegang tot detail.ejs, express geeft er dus een bestand aan mee
      // en in die template heb je dan toegang tot die data
      // res.render('detail.ejs', Object.assign({}, result, helpers))
      // Als er dus geen bestand is gevonden, dan wordt er een error gegeven

      // Het staat op deze plek omdat je in de if data opvraagt, en je het als json of html terugwilt
      // dit is namelijk de enige plek waar de code werkt
      // bij de error hoeft dit niet omdat je daar geen data opvraagt
      /* Support both a request for JSON and a request for HTML  */
      res.format({
        json: () => res.json(result),
        html: () => res.render('detail.ejs', Object.assign({}, result, helpers))
      })
    } else if (db.removed(id)) {
      var result = {
        errors: [{
          id: 410,
          title: '410',
          detail: 'Gone'
        }]
      }
      res.render('error.ejs', Object.assign({}, result, helpers))
    } else {
      // Hier geef je info in je error template, dus een id,g titel en een detail tekstje, maar je ziet het niet op de website
      var result = {
        errors: [{
          id: 404,
          title: '404',
          detail: 'Not Found'
        }]
      }
      // Hier krijg je toegang tot detail.ejs, express geeft er dus een bestand aan mee
      // En in die template heb je dan toegang tot die data
      res.status(404).render('error.ejs', Object.assign({}, result, helpers))
    }
  } catch (err) {
    // Hier geef je info in je error template, dus een id, titel en een detail tekstje, maar je ziet het niet op de website
    var result = {
      errors: [{
        id: 400,
        title: '400',
        detail: 'Invalid identifier'
      }]
    }
    // Hier krijg je toegang tot detail.ejs, express geeft er dus een bestand aan mee
    // En in die template heb je dan toegang tot die data
    res.status(400).render('error.ejs', Object.assign({}, result, helpers))
    // Einde van een catch, return stopt het en dan gaat hij eruit
    return
  }
}

function remove(req, res, next) {
  var id = req.params.id
  // Var result = {errors: [], data: db.remove(id)}

  try {
    if (db.removed(id)) {
      console.log('Dier is al verwijderd')
      return next()
    } else {
      db.remove(id)
      console.log('Zojuist is het dier verwijderd')
    }
  } catch (err) {
    console.log('Dier bestaat niet')
    return next()
  }
}

// Deze functie is voor het formulier, hierbij laat je toe dat als ze /add in de browser typen,
// Dat je bij form.ejs komt en dus het form kan invullen
function renderForm(req, res) {
  res.render('form.ejs')
}

// Deze functie zorgt ervoor dat de gegevens die zijn ingevuld in het formulier, in de database worden gezet
// Daardoor kan er een detailpagina van worden gemaakt
function add(req, res, next) {
  var form = req.body
  try {
    // https://stackoverflow.com/questions/3073176/javascript-regex-only-english-letters-allowed
    var letters = /^[A-Za-z]+$/
    var naam = letters.test(form.name)
    var omschrijving = letters.test(form.description)
    var kleur = letters.test(form.primaryColor)
    console.log(naam, omschrijving, kleur)
    if (naam && omschrijving && kleur) {
      // In de variabele form, geef je cleanForm, dat is een functie, daarin geef je req.body aan mee
      // req.body is alles wat je terugkrijgt van het formulier
      var schoonform = cleanForm(req.body)
      db.add(schoonform)
    } else {

    }
    // De functie cleanForm veranderd de gegevens naar wat nettere gegevens en die geeft ze weer terug
    // In de console krijg je form te zien, oftewel alle gegevens die zijn ingevuld in het formulier
    console.log(form)
    // Hier voeg je form toe aan je db dmv. db.add. Dus de gegevens komen hierdoor in de database te staan
    form = db.add(form)
    // Dan redirect je naar de detailpagina van het nieuwe dier, door '/' te doen en dan de nieuwe gegevens in form
    // te linken aan een id. id is het nummer van het dier dus dat zie je in de browser
    res.redirect('/' + form.id)
  } catch (err) {
    console.log(err)
    // Als het niet werkt door iets dan wordt er een error gegeven, vandaar dat er next in de parameters wordt gegeven
    return next()
  }
}

// De functie cleanForm, schoont alle gegevens op die string zijn en bijvoorbeeld een Boolean of Number moeten zijn
// Je geeft inputForm aan mee omdat je de input van het form wilt gebruiken in deze functie
function cleanForm(form) {
  // Dan selecteer je de bepaalde elementen in form die moeten worden veranderd, met form.vaccinated
  // dus vaccinated, declawed, age en weight moeten worden veranderd van string naar Boolean of number
  // Nadat je dat hebt aangegeven, zet je na de '=' de bepaalde content type die je aan dat element mee wilt geven
  // En daarin selecteer je weer de form elementen die erbij horen
  form.vaccinated = Boolean(form.vaccinated)
  form.age = Number(form.age)
  form.weight = Number(form.weight)

  // Wanneer de value van type een 'cat' is, dan wordt declawed geactiveerd, en wordt het omgezet naar Boolean
  // Form.type = je selecteert hier de label type in je formulier. dus daar wordt ingevuld of het dog/cat/rabbit is
  // Als die value die is ingevuld bij form.type gelijk is aan 'cat' dan wordt het declawed dus Boolean
  if (form.type === 'cat') {
    // Je selecteert hier dus de label declawed in je form, en die zet je om van string naar Boolean
    // In Boolean moet je ook nog declawed nog een keer aangeven, dus tussen de ()
    form.declawed = Boolean(form.declawed)
    // Is de form.type value niet gelijk aan 'cat', dan wordt declawed omgezet naar undefined,
  } else {
    // Er wordt dus ook geen Boolean van gemaakt, hij bestaat zegmaar niet meer
    // in je form.ejs heb ik ook nog (only cats) bij de label declawed gezet zodat mensen die cat hebben
    // het moeten invullen en de rest niet
    form.declawed = undefined
  }
  return form
}
