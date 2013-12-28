var logger = require('logger')
  , http = require('http')
  , express = require('express')
  , cheerio = require('cheerio')
  , random = require('secure_random')
  , twit = require('twit') //https://github.com/ttezel/twit
  , util = require('util');


//config
var T = new twit({
    consumer_key:         '...'
  , consumer_secret:      '...'
  , access_token:         '...'
  , access_token_secret:  '...'
})

var initQuery = ['there is no place like home','may the force be with you',
  'not all who wander are lost','4chan','urban dictionary best words'];

/** Minimum number of links on a site to go to a sub site */
var requiredSubLinks = 5;

var useSubSites = false;

var aggressiveMode = false;

var minDelay = 2 * 60 * 60 * 1000;
var maxDelay = 12 * 60 * 60 * 1000;

logger.setShowDebug(false);//show debug messages

//global variables

var sentenceDelimeters = ['"','.','!','?'];

var pageBlacklist = ['facebook','twitter','google','amazon', 'flickr'];

var fileEndingsBlacklist = ['.jpg','.png','.gif','.pdf','.doc'];

var query = initQuery;

var lastUsedSite = '';


// Utility function that downloads a URL and invokes
// callback with the data.
function download(url, callback) {
  http.get(url, function(res) {
    res.setEncoding(encoding='utf8');
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(data, url);
    });
  }).on("error", function() {
    callback(null, url);
  });
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function linkFilter(element){
  if (element){
    if (typeof element == 'undefined') return false;
    //never visit the same site twice
    if (element == lastUsedSite) return false;
    //check against the blacklist
    if (pageBlacklist.indexOf(element) > -1) return false;
    //check if this goes to a file
    for (i = 0; i < fileEndingsBlacklist.lenght; i++){
      if (endsWith(element,fileEndingsBlacklist[i])) return false;
    }
    //the library does not work with https so only take http  
    if (element.indexOf('http:') === 0) return true;
  }
  return false;
}


function main(){
  if (query === null){
    random.getRandomInt(0,initQuery.length-1,function(err,value){
      query = initQuery[value];
      logger.d('Starting the loop with keyword: '+query);
      //start the search
      download('http://www.bing.com/search?q='+query, chooseWebsiteFromBing);
    });
  } else {
    logger.d('Starting the loop with keyword: '+query);
    //start the search
    download('http://www.bing.com/search?q='+query, chooseWebsiteFromBing);
  }
};

/**
 * Choose a website from bing
 */
function chooseWebsiteFromBing(html){
  if (!html) {
    logger.e('Error when loading search engine results, aborting...');
    main();
    return;
  }
  //analyze the URL to find the links on it
  var $ = cheerio.load(html);
  //find the content
  var elements = [];
  $('.sb_tlst h3 a').each(function(i, elem){
    elements[i] = $(this).attr('href');    
  });
  elementsFiltered = elements.filter(linkFilter);
  //there is the rare case that bing does not find anything which means
  //we start at the beginning again
  if (elementsFiltered.length <= 0) {
    logger.w('found no links on bing, unfiltered was: '+util.inspect(elements));
    query = null;
    main();
    return;
  }
  //choose one of the links
  random.getRandomInt(0, elementsFiltered.length-1, function(err, value){
    logger.d('Opening site '+elementsFiltered[value]+' (selected '+value+
      ' of '+elements.length+')');
    if (useSubSites)  download(elementsFiltered[value],chooseLinkFromSite);
    else download(elementsFiltered[value],chooseTextFromSite);
  });
};

/**
 * Select a random link from a website
 */
function chooseLinkFromSite(html, origin){
  if (!html) {
    logger.e('Error when loading site, aborting...');
    main();
    return;
  }
  //just take any link
  var $ = cheerio.load(html);
  //find the content
  var links = [];
  $('a').each(function(i, elem){
    links[i] = $(this).attr('href');    
  });
  //remove all non http links (e.g. anchors)
  links = links.filter(linkFilter);  
  logger.debugObject('found following links on page: ',links);
  //only follow one of the links if there are enough
  if (links.length < requiredSubLinks){
    logger.w('Less than '+requiredSubLinks+' found, taking text from main site');
    chooseTextFromSite(html,origin);
  } else {
    //choose one of the links
    random.getRandomInt(0, links.length-1, function(err, value){
      if (err) {
        logger.e('Error when generating random number, aborting...');
        main();
        return;
      }
      logger.d('Opening sub-site '+links[value]+' (selected '+value+
        ' of '+links.length+')');
      download(links[value],chooseTextFromSite);
    });
  }
}

/**
 * Choose a random sentence from the website
 */
function chooseTextFromSite(html, origin){
  if (!html) {
    logger.e('Error when loading final site content, aborting...');
    main();
    return;
  }
  //store the page to not use it again
  lastUsedSite = origin;  
  
  //parsing very big websites can cause a stack overflow
  var body = null;
  try {
    var $ = cheerio.load(html);
    //only consider stuff in the body tag
    body = $('body').html();
    if (body === null){
      logger.w('Body is null! Using full HTML');
      body = html;
    }
  } catch(err){
    logger.e('Error when parsing website body '+err);
    body = html;
  }
  
  //remove all script tags
  body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,'');
  //and all css tags which sometimes are in the body
  body = body.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,'');
  //strip all HTML tags from the body
  body = body.replace(/(<([^>]+)>)/ig,'');
  //replace html entitites with proper stuff
  body = body.replace(/&nbsp;/g,' ');
  body = body.replace(/&lt;/g,'<');
  body = body.replace(/&gt;/g,'>');
  body = body.replace(/&amp;/g,'&');
  body = body.replace(/&euro;/g,'€');
  body = body.replace(/&middot;/g,'·');  
  body = body.replace(/&quot;/g,'"');
  body = body.replace(/&ndash;/g,'–');
  body = body.replace(/&mdash;/g,'—');
  //replace all carriage returns with spaces
  body = body.replace(/[\n\r]/g, ' ');
  //replace all multi spaces and tabs with singe spaces
  body = body.replace(/\s{2,}/g,' ');
  //set a virtual cursor anywhere in the body but not in the beginning or end
  random.getRandomInt(body.length*0.3,body.length*0.7, function(err,value){
    if (err) {
      logger.e('Error when generating random number, aborting...');
      main();
      return;
    }
    var cursor = value;
    var start = 0;
    var end = body.length;
    //iterate to the front to find the beginning of the sentence
    for (i = cursor; i >= 0; i--){
      if (sentenceDelimeters.indexOf(body.charAt(i)) > -1){
        logger.d('found start delimeter at '+i+' which is '+body.charAt(i));
        start = i + 1;//one position behind the start
        break;
      }
    }
    //find the end of the sentences
    for (i = cursor; i <= body.length; i++){
      if (sentenceDelimeters.indexOf(body.charAt(i)) > -1){
        logger.d('found end delimeter at '+i+' which is '+body.charAt(i));
        end = i;
        break;
      }
    }
    logger.d('Cursor: '+cursor+' start: '+start+' end: '+end);
    //build a substring and prepare it properly
    var text = body.substring(start,end+1);
    text = text.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'');
    //ensure that the text is only 140 characters long
    if (text.length > 140){
      logger.d('text is '+text.length+' characters long: '+text);
      text = text.substring(0,137);
      text = text.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g,'');
      //add 3 dots if the text ends mid sentence
      if (text.charAt(137) !== ' '){
        text = text+'...';
      }
    }
    
    if (aggressiveMode) text = text.toUpperCase();
    sendTweet(text);
  });  
}

/**
 * Send a text to twitter
 */
function sendTweet(text){  
  //always keep track of the last thing said to base future searches on it
  query = text;
  
  //actually tweet this stuff
  T.post('statuses/update', {
    status: text
  }, function(err, reply) {
    if (err){
      logger.e('Error when sending tweet '+err);
    }
    logger.i('Sent tweet: '+text+' [from '+lastUsedSite+']');
    //schedule the main function to run again
    random.getRandomInt(minDelay, maxDelay, function(err, value){
      logger.i('scheduling function to run again in '+Math.floor(value/1000/60)
        +' minutes');
      setTimeout(main, value);
    });
  });
}

//some server stuff in case anybody visits the server
var app = express();

app.get('/', function(req, res) {
  res.redirect('https://github.com/LAL-Apps/mechanical-bird');
  res.send('<a href="https://github.com/LAL-Apps/mechanical-bird">'+
    'Hello from the Mechanical Bird (click me to view code)</a>');
});

//start the tweet loop
main();

app.listen(process.env.VCAP_APP_PORT || 3000);

logger.i('Mechanical Hummingbird started');