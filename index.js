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

Minibus.prototype.getGreenRouteInfo = function(route_code, area) {
  var uri;
  switch (area) {
    case Minibus.HONG_KONG_ISLAND:
      uri = '/gh_' + route_code + '.html';
      break;
    case Minibus.KOWLOON_SIDE:
      uri = '/gk_' + route_code + '.html';
      break;
    case Minibus.NEW_TERRITORIES:
      uri = '/gn_' + route_code + '.html';
      break;
  }

  var options = {
      method: 'GET',
      baseUrl: 'http://www.16seats.net/eng/gmb',
      uri: uri,
      headers: {
        'User-Agent': this.options.userAgent
      },
    };

  return rp(options)
    .then(function(html) {
      return cheerio.load(html, {
        normalizeWhitespace: true,
        xmlMode: true
      });
    }).then(function($) {
      var routeInfo = {
        service_frequency: {},
        service_hours: {}
      };

      $('table tr').each(function(i) {
        if (i === 4) {
          routeInfo.number = $(this).find('td table tr td table tr td').eq(1).text().trim();
          routeInfo.en_name = $(this).find('td table tr td table tr td').eq(2).text().trim();
        } else if (i === 11) {
          routeInfo.direction = $(this).find('td table tr').eq(1).text().trim();
          routeInfo.summary = $(this).find('td table tr').eq(2).text().trim();
          routeInfo.service_hours.monday_friday = $(this).find('td table tr').eq(4).children('td').eq(1).text().split(' - ');
          routeInfo.service_hours.saturday = $(this).find('td table tr').eq(5).children('td').eq(1).text().split(' - ');
          routeInfo.service_hours.sunday_holidays = $(this).find('td table tr').eq(6).children('td').eq(1).text().split(' - ');
          routeInfo.service_frequency.monday_friday = $(this).find('td table tr').eq(4).children('td').eq(3).text().split(' - ');
          routeInfo.service_frequency.saturday = $(this).find('td table tr').eq(5).children('td').eq(3).text().split(' - ');
          routeInfo.service_frequency.sunday_holidays = $(this).find('td table tr').eq(6).children('td').eq(3).text().split(' - ');

          var routeTable = $(this).find('td table tr').eq(8).find('td table tr');
          var places = [];
          var j = 0;

          routeTable.each(function(i) {
            if (i < 1) {
              return;
            }
            var roadName;
            var landMark;

            console.log($(this).find('td').eq(0).find('div').length);
            if ($(this).find('td').eq(0).find('div').length === 1) {
              roadName = $(this).find('td').eq(0).find('div').contents().filter(function() {
                  return this.type === 'text';
              }).text().trim();
              landMark = $(this).find('td').eq(0).find('div span').text().replace(']','').replace('[','').trim();
            } else {
              roadName = $(this).find('td').eq(0).text().replace('&nbsp;','').replace('nbsp;','').trim();
              if (roadName === '') {
                roadName = places[j-1].road_name;
              }
              landMark = $(this).find('td').eq(2).text().replace('&nbsp;','').replace('nbsp;','').trim();
            }

            places.push({road_name: roadName, land_mark: landMark});
            j++;
            //console.log($(this).find('td').eq(2).html());
          });
          console.log(places);

        }

        //console.log($(this).html());
        // switch (i) {
        //   case 5:
        //     console.log($(this).html());
        //     break;
        //   case 6:
        //
        //     break;
        // }
      });

      //console.log(routeNumber, routeName); //.each(function(i) {
      //   switch (i) {
      //     case 4:
      //       console.log($(this).html());
      //       break;
      //   }
      // });

      return routeInfo;
    });
};

module.exports = Minibus;

var minibus = new Minibus();
// minibus.getGreenRoutes().then(function(routes) {
//   console.log(routes);
// });

minibus.getGreenRouteInfo('1', Minibus.HONG_KONG_ISLAND).then(function(info) {
  console.log(info);
});
