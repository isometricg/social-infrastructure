
//--Инициализация карты и стиля карты
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FtdGFrb3kiLCJhIjoiY2t1bnV6a3I0MDhpMjJ3bWRuM3ZlOWtkNyJ9.x-9fPtL0GdB1Zjwmi1jlAg';
      const map = new mapboxgl.Map({
        container: 'mapid', // container id
        style: 'mapbox://styles/mapbox/streets-v11', // стиль отображения карты
        center: [37.6155600, 55.7522200], // стартовая позиция карты
        zoom: 10 // стартовый зум карты
      });



//--Создание слоев на карте
map.on('load', () => {
//-- Слой с секторами 500 на 500 берется из geojson фала
  map.addLayer({
            id: 'razb_distr',
            type: 'fill',
            id_rus: 'Сектора 500х500',
            source: {
               type: 'geojson',
               data: razb_distr
            },
            layout: {'visibility': 'none'},
            paint: {
                    'fill-color': '#627BC1',
                    'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                    ]
            }
        });
//-- Слой с адм округами берется из geojson файла. Пока выключено
  map.addLayer({
            id: 'mos_distr',
            type: 'fill',
            id_rus: 'Сектора 500х500',
            source: {
               type: 'geojson',
               data: mos_distr
            },
            layout: {'visibility': 'none'},
            paint: {
                    'fill-color': '#627BC1',
                    'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                    ]
            }
        });


//-- Слой с МФЦ берется из geojson фала
  map.addLayer({
            id: 'mfc',
            id_rus: 'МФЦ',
            type: 'circle',
            source: {
              type: 'geojson',
              data: mfc
            },
            layout: {
                'visibility': 'visible'             
            },
            paint: {
                'circle-color': 'red'
                }
  });
//-- Слой для расположенных рядом МФЦ
  map.addSource('nearest-mfc', {
            type: 'geojson',
            data: {
            'type': 'FeatureCollection',
            'features': []
            }
  });

});

//--В эту переменную записываем ближайшие мфц
var geojson = {
          "type": "FeatureCollection",
          "features": []
        };
//--В эту переменную записываем линии до ближайшего  мфц
var geoline = {
          "type": "FeatureCollection",
          "features": []
        };

//--В эту переменную записываем сектора с цветом зависящем от расстоянию до ближайшего МФЦ
var pokritie = {
          "type": "FeatureCollection",
          "features": []
        };

//Всплывающее окно при наведении на МФЦ показывает название МФЦ, можно добавить любую информацию из датасета
const popup = new mapboxgl.Popup();
map.on('mousemove', (event) => {
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['mfc']
      });
      if (!features.length) {
        popup.remove();
        return;
      }
      const feature = features[0];
      popup
        .setLngLat(feature.geometry.coordinates)
        .setHTML(feature.properties.mfc_name)
        .addTo(map);
      map.getCanvas().style.cursor = features.length ? 'pointer' : '';
});


cent_sector = []; //--Переменная с координатами центра сектора
//--Цикл проходит по всем объектам в geojson с секторами и ищет центр этих секторов,
//--от этого центра будем считать расстояние до ближайшего МФЦ
for (var i = 0; i < razb_distr.features.length; i++) {
//--Для нахождения центра сектора используем библиотеку turf
    var polygon_distr = turf.polygon(razb_distr.features[i].geometry.coordinates); //--Берем из каждого объекта в geojson координаты и делаем из них turf полигон
    var centr_polygon = turf.centroid(polygon_distr); //--Находим центр turf-полигонов
    var lon = centr_polygon.geometry.coordinates[0]; //--Координата центра сектора
    var lat = centr_polygon.geometry.coordinates[1]; //--Координата центра сектора
    //--Отрисоваем на карте центр каждого полигона
    //var marker1 = new mapboxgl.Marker()
    //     .setLngLat([lon, lat]) // [lng, lat] coordinates to place the marker at
    //     .addTo(map);

    var centr_point = turf.point([lon,lat])

    cent_sector.push([lon,lat]);

     //--Находим ближлижайшие МФЦ к сектору с помощью turf.nearest
    var nearest_mfc = turf.nearest(centr_point,mfc);

    //console.log('Координаты цента сектора:',lon,lat);
    //console.log('Объекты',nearest_mfc);

//--Добавляем в список объекты-ближайшие МФЦ
    geojson.features.push(nearest_mfc);

}


//--Считаем координаты для линий от сектора до ближайшего МФЦ, тут же посчитаем растояние от центра сектора до МФЦ
for (var ii= 0; ii < geojson.features.length; ii++) {
    var lon_x = geojson.features[ii].geometry.coordinates[0]; //-- Координата МФЦ
    var lat_x = geojson.features[ii].geometry.coordinates[1]; //-- Координата МФЦ
    //--Заполняем список для отрисовки линий от центра сектора до МФЦ
    geoline.features.push({
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': [
              [lon_x,lat_x],
              [cent_sector[ii][0], cent_sector[ii][1]]
            ]
          }
        });
      var center_ = turf.point([lon_x, lat_x])
      var to_mfc =  turf.point([cent_sector[ii][0],cent_sector[ii][1]])

       //--Считаем дистанцию от центра сектора до ближайшего МФЦ
      distance = turf.distance(center_, to_mfc )

      //console.log('Расстояние до ближайших МФЦ',distance*1000);

      var polygon_distr_pokr = razb_distr.features[ii].geometry.coordinates
       //--Заполняем список с полигонами и дистанцией до МФЦ для дальнейшей отрисовки покрытия
      pokritie.features.push({
          'type': 'Feature',
          'properties': {'distance': distance*1000},
          'geometry': {
            'type': 'Polygon',
            'coordinates': polygon_distr_pokr
          }
        });
}

//--Отрисовка новых слоев

map.on('load', () => {
//--Добавляем слой: линии от сектора до ближайшего МФЦ  для наглядности
    map.addLayer(
            {
                id: 'nearest-mfс',
                type: 'line',
                //source: geojson,
                source: {
                  type: 'geojson',
                  data: geoline
                },
                layout: {'visibility': 'none'},
                paint: {
                //'circle-radius': 12,
                'line-color': '#00C000',
                //'circle-color': '#486DE0'
                }
                },
                'mfc'
            );

//--Добавляем слой: полигоны с цветом в зависимости от дальности до МФЦ
    map.addLayer(
            {
                id: 'pokritie',
                type: 'fill',
                source: {
                  type: 'geojson',
                  data: pokritie
                },
                layout: {'visibility': 'none'},
				'paint': {
					'fill-color': [
					'interpolate',
					['linear'],
					['get', 'distance'],
					100,
					'#F2F12D',
					400,
					'#EED322',
					800,
					'#E6B71E',
					1000,
					'#DA9C20',
					1300,
					'#CA8323',
					1500,
					'#B86B25',
					2000,
					'#A25626',
					2500,
					'#8B4225',
					3000,
					'#723122'
					],
					'fill-opacity': 0.75
					}
            });
    });


//-- Кнопки отображения/скрытия слоев на карте
const layerList = document.getElementById('menu');
const inputs = layerList.getElementsByTagName('input');

for (const input of inputs) {
    input.onclick = (layer) => {
    const layerId = layer.target.id;
    const visibility = map.getLayoutProperty(
        layerId,
        'visibility'
    );
    if (visibility === 'visible') {
        map.setLayoutProperty(layerId, 'visibility', 'none');
    }
    else {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
    }
    }
};
//--Показываем легенду при нажатии на Покрытие
$(function() {
    $( "#pokritie" ).click(function() {
        $( "#legend" ).toggle();
    });
});



