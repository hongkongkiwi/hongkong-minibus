var Promise = require('bluebird');
var rp = require('request-promise');
var _ = require('underscore');
var cheerio = require('cheerio');
var random_useragent = require('random-useragent');

var Minibus = function(options) {
  this.options = _.extendOwn({
    userAgent: random_useragent.getRandom()
  }, options);

  // For now this is not handled
  this.options.lang = 'en';
};

Minibus.NEW_TERRITORIES = 'ntt';
Minibus.HONG_KONG_ISLAND = 'hki';
Minibus.KOWLOON_SIDE = 'kln';

/**
* Gets all minibus routes
*/
Minibus.prototype.getGreenRoutes = function(area) {

  var self = this;

  function getRouteListPromise(area) {
    var options = {
        method: 'GET',
        baseUrl: 'http://www.16seats.net/eng/gmb',
        uri: '/g_' + area + '.html',
        headers: {
          'User-Agent': self.options.userAgent
        },
      };

    console.log(options);

    return rp(options)
      .then(function(html) {
        return cheerio.load(html, {
          normalizeWhitespace: true,
          xmlMode: true
        });
      }).then(function($) {
        var routes = [];
        $('body table tbody tr').each(function(i) {
          if (i === 0)
            return;

          var routeInfo = {};
          // if ($(this).find('d').first().text().trim() === '') {
          //   return;
          // }
          //console.log($(this).html());
          var code = $(this).children('td').eq(0).text().trim();
          var route_texts = $(this).children('td').eq(1).text().trim().split('-');
          var route = [];
          for (var j = 0; j < route_texts.length; ++j) {
            var text = route_texts[j].trim();
            if (text.length > 0) {
              route.push(text);
            }
          }

          if (code === '' || route === '') {
            return;
          }
          var notes = [];
          $(this).children('td').eq(2).children('img').each(function() {
            notes.push($(this).attr("alt"));
          });

          routeInfo.code = code;
          routeInfo.en_name = route;
          routeInfo.notes = notes;
          routeInfo.area = area;
          routes.push(routeInfo);
        });
        return routes;
      });
  }

  var areas = area ? [area] : [
    Minibus.NEW_TERRITORIES,
    Minibus.HONG_KONG_ISLAND,
    Minibus.KOWLOON_SIDE
  ];

  var promises = [];
  for (var i = 0; i < areas.length; ++i) {
      promises.push(getRouteListPromise(areas[i]));
  }

  return Promise.all(promises).then(function(routes) {
    var result = [];
    for (var i = 0; i < routes.length; ++i) {
      result=result.concat(routes[i]);
    }
    return result;
  });
};

Minibus.prototype.getGreenRouteInfo = function(route_code) {

};

//http://www.16seats.net/eng/gmb/gh_4b.html

module.exports = Minibus;

var minibus = new Minibus();
// minibus.getGreenRoutes().then(function(routes) {
//   console.log(routes);
// });

minibus.getGreenRouteInfo().then(function(info) {
  console.log(info);
});
