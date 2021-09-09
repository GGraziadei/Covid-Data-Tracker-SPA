
$(document).ready(function () {
  $().ready(function () {
    var dataRegioniUrl;
    var dataItaliaUrl;
    var dataItalia;
    var dataRegioni;
    var mapDataFetch = new Map();
    var megaMenu;
    var note;
    
    var grafico2d = document.getElementById('grafico2d').getContext('2d');
    var lineChart = lineChart = new Chart(grafico2d, {
      type: 'line',
      data: {},
      options: {
        scales: {
          yAxes: [{
            ticks: {
              reverse: false
            }
          }]
        }
      }
    });

    //Regione di partenza 
    var titoloSubPage;
    var codiceRegione;

    //first run, genero il menu con le regioni ed assegno un codice ad ogni regione
    // setto i parametri per la situazione di partenza
    dataSourceUpdate().then(response => {
      megaMenu = "";
      response.forEach(regione => {
        megaMenu += "<li id = " + regione.codice_regione + " class='nav-item' denominazione-regione='" + regione.denominazione_regione + "'>";
        megaMenu += "<a denominazione-regione='" + regione.denominazione_regione + "' codice-regione = " + regione.codice_regione + " class='nav-link pwa-update' href='#" + regione.denominazione_regione.replace(/ /g, "-") + "'>";
        megaMenu += "<i class='material-icons'>outlined_flag</i>";
        megaMenu += "<p>" + regione.denominazione_regione + "</p>"
        megaMenu += "</a>";
        megaMenu += "</li>";
      });
      $('ul#megaMenu').html(megaMenu);
      if ($.cookie('titoloSubPage'))
        titoloSubPage = $.cookie('titoloSubPage');
      else titoloSubPage = "Italia";
      if ($.cookie('codiceRegione') && $.cookie('codiceRegione') !== 0) {
        codiceRegione = $.cookie('codiceRegione');
        $("li#0").removeClass("active");
        $("li#" + codiceRegione).addClass("active");
      }
      else codiceRegione = 0;

      $('#titoloSubPage').text(titoloSubPage);
      $('#ultimoAggiornamento').text('ultimo aggiornamento dati : ' + dataItalia.data);
      $('#titoloSubPage').attr("href", "#" + titoloSubPage);

      console.log(titoloSubPage + " => " + codiceRegione);
      data = generateData(codiceRegione);
      getNote().then(note => {

        noteDateList = "";
        noteList = "";
        dataSet = new Set();

        note.sort(
          (nota1, nota2) => { return new Date(nota2.data).getTime() - new Date(nota1.data).getTime(); }
        ).forEach(nota => {
          data = new Date(nota.data);
          if (dataSet.has(nota.data) == false) {
            noteDateList += "<li class='nav-item '>";
            noteDateList += "<a class='nav-link note-data'  data-evento=" + data.getTime() + ">";
            noteDateList += "<i class='material-icons'>calendar_today</i>" + data.getUTCDate() + "/" + data.getUTCMonth() + "/" + data.getUTCFullYear();
            noteDateList += "<div class='ripple-container'></div>";
            noteDateList += "</a>";
            noteDateList += "</li>";
            dataSet.add(nota.data);
          }

          noteList += "<tr data-evento ='" + data.getTime() + "'>";
          noteList += "<td class='text-center'>" + data.getUTCDate() + "/" + data.getUTCMonth() + "/" + data.getUTCFullYear() + "</td>";
          noteList += "<td class='text-justify'>" + nota.note + "</td>";
          noteList += "<td class='td-actions text-right'>";
          noteList += "<button type='button' rel='tooltip' title='Remove' class='btn btn-danger btn-link btn-sm event-exit'>";
          noteList += "<i class='material-icons'>close</i>";
          noteList += "</button>";
          noteList += "</td>";
          noteList += "</tr>";
        });
        $('.nav-tabs-events').html(noteDateList);
        $('.events').html(noteList);
      });

      if (data.note_casi) {
        $('.region-note').fadeIn(100);
        $('h4#region-note').text("Note casi regione " + titoloSubPage);
        $('p#region-note').text(data.data);
        $('div#region-note').text(data.note_casi);
      }
    });

    //Update delle note al click su filtro date
    $(document).on('click', '.note-data', function () {
      data = $(this).attr('data-evento');
      $('.note-data').removeClass('active');
      $(this).addClass('active');
      $("tr[data-evento='" + data + "']").fadeIn(300);
      $("tr[data-evento!='" + data + "']").fadeOut(300);
    });

    //Gestione delle note e filtro date
    $(document).on('dblclick', '.note-data', function () {
      $('.note-data').removeClass('active');
      $("tr[data-evento!='']").fadeIn(300);
    });
    $(document).on('click', '.event-exit', function () {
      $(this).parent().parent().fadeOut(100);
    });

    //Update della pagina al click su nav-item
    $(document).on('click', '.pwa-update', function () {

      //Rimozione classe 'active' a precedente selezione e contestuale riselezionamento
      $("li#" + codiceRegione).removeClass("active");
      $('.region-note').fadeOut(100);

      codiceRegione = $(this).attr("codice-regione");
      titoloSubPage = $(this).attr("denominazione-regione");

      $.cookie('codiceRegione', codiceRegione);
      $.cookie('titoloSubPage', titoloSubPage);

      console.log(titoloSubPage + " => " + codiceRegione);
      //Aggiornamento dei dati da visualizzare
      data = generateData(codiceRegione);

      $('#titoloSubPage').text(titoloSubPage);
      $('#titoloSubPage').attr("href", "#" + titoloSubPage);
      $("li#" + codiceRegione).addClass("active");

      $.notify({
        icon: "add_alert",
        message: "Hai selezionato " + titoloSubPage

      }, {
        type: 'warning',
        timer: 100,
        placement: {
          from: 'bottom',
          align: 'right'
        }
      });

      if (data.note_casi) {
        $('.region-note').fadeIn(100);
        $('h4#region-note').text("Note casi regione " + titoloSubPage);
        $('p#region-note').text(data.data);
        $('div#region-note').text(data.note_casi);
      }
    });

    //Adamento pandemico
    $('#generatoreGrafico').click(function () {
      $('.modal-header').text("Andamento pandemico " + titoloSubPage);

      dataInizio  = new Date ($('#data-inizio').val());
      dataFine    = new Date ($('#data-fine').val());

      getAndamentoPandemico(codiceRegione, dataInizio, dataFine).then(data => {
        var dataChart_casiPositivi = {
          labels: data.map( rilevazione => rilevazione.data),
          datasets: [{
            label: 'Casi positivi',
            data: data.map( rilevazione => rilevazione.totale_positivi),
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          },
          {
            label: 'Guariti',
            data: data.map( rilevazione => rilevazione.dimessi_guariti),
            fill: false,
            borderColor: 'rgba(54, 162, 235, 1)',
            tension: 0.1
          },
          {
            label: 'Deceduti',
            data: data.map( rilevazione => rilevazione.deceduti),
            fill: false,
            borderColor: 'rgba(255, 206, 86, 1)',
            tension: 0.1
          },
        ]
        };
        lineChart.data = dataChart_casiPositivi;
        lineChart.update();
        $('#grafico').modal();
      });
    });

    //Aggiornamento dei dati
    $('#updateData').click(function () {
      dataSourceUpdate().then(
        function () {
          $.notify({
            icon: "add_alert",
            message: "Dati correttamente aggiornati"

          }, {
            type: 'success',
            timer: 1000,
            placement: {
              from: 'bottom',
              align: 'right'
            }
          })
        });
    });

    $('a#dataRegioniUrl').attr('href', dataRegioniUrl);
    $('a#dataItaliaUrl').attr('href', dataItaliaUrl);

    $sidebar = $('.sidebar');

    $sidebar_img_container = $sidebar.find('.sidebar-background');

    $full_page = $('.full-page');

    $sidebar_responsive = $('body > .navbar-collapse');

    window_width = $(window).width();

    fixed_plugin_open = $('.sidebar .sidebar-wrapper .nav li.active a p').html();

    function generateData(codiceRegione) {
      data = mapDataFetch.get(parseInt(codiceRegione));
      $('.card-data').each(
        function () {
          attributo = $(this).attr('data');
          valore = "";
          switch (attributo) {
            case 'totale_positivi': valore = data.totale_positivi;
              break;
            case 'tamponi_test_antigenico_rapido': valore = data.tamponi_test_antigenico_rapido;
              break;
            case 'totale_positivi_test_molecolare': valore = data.totale_positivi_test_molecolare;
              break;
            case 'totale_ospedalizzati': valore = data.totale_ospedalizzati;
              break;
            case 'dimessi_guariti': valore = data.dimessi_guariti;
              break;
            case 'isolamento_domiciliare': valore = data.isolamento_domiciliare;
              break;
            case 'terapia_intensiva': valore = data.terapia_intensiva;
              break;
            case 'deceduti': valore = data.deceduti;
              break;

          }
          $(this).text(valore);
        });

      return data;
    }

    async function dataSourceUpdate() {
      if ($('input#dataRegioniUrl').val())
        dataRegioniUrl = $('input#dataRegioniUrl').val();
      else dataRegioniUrl = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni-latest.json";
      if ($('input#dataItaliaUrl').val())
        dataItaliaUrl = $('input#dataItaliaUrl').val();
      else dataItaliaUrl = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale-latest.json";
      dataRegioni = await getDataRegioni();
      dataItalia = await getDataItalia();
      return dataRegioni;
    }

    async function getDataItalia() {
      var result = "";
      if ($.cookie('DataItalia')) {
        json_data = JSON.parse($.cookie('DataItalia'));
        result = json_data;
        diff = (new Date().getTime() - Date.parse(json_data.data)) / 3600000;
        if (diff >= 6) {
          $.removeCookie('DataItalia');
          return getDataItalia();
        }
      }
      else {
        await $.ajax({
          url: dataItaliaUrl,
          dataType: "json",
          async: true,
          success: function (data) {
            result = data[0];
          },
          error: function (jqXHR, exception) {
            var msg = '';
            if (jqXHR.status === 0) {
              msg = 'Not connect.\n Verify Network.';
            } else if (jqXHR.status == 404) {
              msg = 'Requested page not found. [404]';
            } else if (jqXHR.status == 500) {
              msg = 'Internal Server Error [500].';
            } else if (exception === 'parsererror') {
              msg = 'Requested JSON parse failed.';
            } else if (exception === 'timeout') {
              msg = 'Time out error.';
            } else if (exception === 'abort') {
              msg = 'Ajax request aborted.';
            } else {
              msg = 'Uncaught Error.\n' + jqXHR.responseText;
            }
            console.log(msg);
          }
        });
        $.cookie('DataItalia', JSON.stringify(result));
      }
      mapDataFetch.set(0, result);
      return result;
    };

    async function getDataRegioni() {
      var result = "";
      if ($.cookie('DataRegioni')) {
        json_data = JSON.parse($.cookie('DataRegioni'));
        result = json_data;
        diff = (new Date().getTime() - Date.parse(json_data.data)) / 3600000;
        if (diff >= 6) {
          $.removeCookie('DataRegioni');
          return getDataItalia();
        }
      }
      else {
        await $.ajax({
          url: dataRegioniUrl,
          dataType: "json",
          async: true,
          success: function (data) {
            result = data;
          },
          error: function (jqXHR, exception) {
            var msg = '';
            if (jqXHR.status === 0) {
              msg = 'Not connect.\n Verify Network.';
            } else if (jqXHR.status == 404) {
              msg = 'Requested page not found. [404]';
            } else if (jqXHR.status == 500) {
              msg = 'Internal Server Error [500].';
            } else if (exception === 'parsererror') {
              msg = 'Requested JSON parse failed.';
            } else if (exception === 'timeout') {
              msg = 'Time out error.';
            } else if (exception === 'abort') {
              msg = 'Ajax request aborted.';
            } else {
              msg = 'Uncaught Error.\n' + jqXHR.responseText;
            }
            console.log(msg);
          }
        });
        $.cookie('DataRegioni', JSON.stringify(result));
      }
      result.forEach(regione => {
        mapDataFetch.set(regione.codice_regione, regione);
      });
      return result;
    };


    async function getNote() {
      var result = "";
      await $.ajax({
        url: "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-note.json",
        dataType: "json",
        async: true,
        success: function (data) {
          result = data;
        },
        error: function (jqXHR, exception) {
          var msg = '';
          if (jqXHR.status === 0) {
            msg = 'Not connect.\n Verify Network.';
          } else if (jqXHR.status == 404) {
            msg = 'Requested page not found. [404]';
          } else if (jqXHR.status == 500) {
            msg = 'Internal Server Error [500].';
          } else if (exception === 'parsererror') {
            msg = 'Requested JSON parse failed.';
          } else if (exception === 'timeout') {
            msg = 'Time out error.';
          } else if (exception === 'abort') {
            msg = 'Ajax request aborted.';
          } else {
            msg = 'Uncaught Error.\n' + jqXHR.responseText;
          }
          console.log(msg);
        }
      });
      return result;
    };

    async function getAndamentoPandemico(codiceRegione, dataInizio, dataFine) {
      result = "";
      if (codiceRegione == 0) url = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json";
      else url = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json";

      await $.ajax({
        url: url,
        dataType: "json",
        async: true,
        success: function (data) {
          result = data;
        },
        error: function (jqXHR, exception) {
          var msg = '';
          if (jqXHR.status === 0) {
            msg = 'Not connect.\n Verify Network.';
          } else if (jqXHR.status == 404) {
            msg = 'Requested page not found. [404]';
          } else if (jqXHR.status == 500) {
            msg = 'Internal Server Error [500].';
          } else if (exception === 'parsererror') {
            msg = 'Requested JSON parse failed.';
          } else if (exception === 'timeout') {
            msg = 'Time out error.';
          } else if (exception === 'abort') {
            msg = 'Ajax request aborted.';
          } else {
            msg = 'Uncaught Error.\n' + jqXHR.responseText;
          }
          console.log(msg);
        }
      });
      if (codiceRegione == 0) 
        return result.filter((rilevazione) => {
          return new Date (rilevazione.data ).getTime() <= dataFine.getTime() &&
          new Date (rilevazione.data ).getTime() >= dataInizio.getTime();
        });
      return result.filter((rilevazione) => {
        return rilevazione.codice_regione == codiceRegione &&
        new Date (rilevazione.data ).getTime() <= dataFine.getTime() &&
        new Date (rilevazione.data ).getTime() >= dataInizio.getTime();
      });
    };

    if (window_width > 767 && fixed_plugin_open == 'Dashboard') {
      if ($('.fixed-plugin .dropdown').hasClass('show-dropdown')) {
        $('.fixed-plugin .dropdown').addClass('open');
      }

    }

    $('.fixed-plugin a').click(function (event) {
      // Alex if we click on switch, stop propagation of the event, so the dropdown will not be hide, otherwise we set the  section active
      if ($(this).hasClass('switch-trigger')) {
        if (event.stopPropagation) {
          event.stopPropagation();
        } else if (window.event) {
          window.event.cancelBubble = true;
        }
      }
    });

    $('.fixed-plugin .active-color span').click(function () {
      $full_page_background = $('.full-page-background');

      $(this).siblings().removeClass('active');
      $(this).addClass('active');

      var new_color = $(this).data('color');

      if ($sidebar.length != 0) {
        $sidebar.attr('data-color', new_color);
      }

      if ($full_page.length != 0) {
        $full_page.attr('filter-color', new_color);
      }

      if ($sidebar_responsive.length != 0) {
        $sidebar_responsive.attr('data-color', new_color);
      }
    });

    $('.fixed-plugin .background-color .badge').click(function () {
      $(this).siblings().removeClass('active');
      $(this).addClass('active');

      var new_color = $(this).data('background-color');

      if ($sidebar.length != 0) {
        $sidebar.attr('data-background-color', new_color);
      }
    });

    $('.fixed-plugin .img-holder').click(function () {
      $full_page_background = $('.full-page-background');

      $(this).parent('li').siblings().removeClass('active');
      $(this).parent('li').addClass('active');


      var new_image = $(this).find("img").attr('src');

      if ($sidebar_img_container.length != 0 && $('.switch-sidebar-image input:checked').length != 0) {
        $sidebar_img_container.fadeOut('fast', function () {
          $sidebar_img_container.css('background-image', 'url("' + new_image + '")');
          $sidebar_img_container.fadeIn('fast');
        });
      }

      if ($full_page_background.length != 0 && $('.switch-sidebar-image input:checked').length != 0) {
        var new_image_full_page = $('.fixed-plugin li.active .img-holder').find('img').data('src');

        $full_page_background.fadeOut('fast', function () {
          $full_page_background.css('background-image', 'url("' + new_image_full_page + '")');
          $full_page_background.fadeIn('fast');
        });
      }

      if ($('.switch-sidebar-image input:checked').length == 0) {
        var new_image = $('.fixed-plugin li.active .img-holder').find("img").attr('src');
        var new_image_full_page = $('.fixed-plugin li.active .img-holder').find('img').data('src');

        $sidebar_img_container.css('background-image', 'url("' + new_image + '")');
        $full_page_background.css('background-image', 'url("' + new_image_full_page + '")');
      }

      if ($sidebar_responsive.length != 0) {
        $sidebar_responsive.css('background-image', 'url("' + new_image + '")');
      }
    });

    $('.switch-sidebar-image input').change(function () {
      $full_page_background = $('.full-page-background');

      $input = $(this);

      if ($input.is(':checked')) {
        if ($sidebar_img_container.length != 0) {
          $sidebar_img_container.fadeIn('fast');
          $sidebar.attr('data-image', '#');
        }

        if ($full_page_background.length != 0) {
          $full_page_background.fadeIn('fast');
          $full_page.attr('data-image', '#');
        }

        background_image = true;
      } else {
        if ($sidebar_img_container.length != 0) {
          $sidebar.removeAttr('data-image');
          $sidebar_img_container.fadeOut('fast');
        }

        if ($full_page_background.length != 0) {
          $full_page.removeAttr('data-image', '#');
          $full_page_background.fadeOut('fast');
        }

        background_image = false;
      }
    });

    $('.switch-sidebar-mini input').change(function () {
      $body = $('body');

      $input = $(this);

      if (md.misc.sidebar_mini_active == true) {
        $('body').removeClass('sidebar-mini');
        md.misc.sidebar_mini_active = false;

        $('.sidebar .sidebar-wrapper, .main-panel').perfectScrollbar();

      } else {

        $('.sidebar .sidebar-wrapper, .main-panel').perfectScrollbar('destroy');

        setTimeout(function () {
          $('body').addClass('sidebar-mini');

          md.misc.sidebar_mini_active = true;
        }, 300);
      }

      // we simulate the window Resize so the charts will get updated in realtime.
      var simulateWindowResize = setInterval(function () {
        window.dispatchEvent(new Event('resize'));
      }, 180);

      // we stop the simulation of Window Resize after the animations are completed
      setTimeout(function () {
        clearInterval(simulateWindowResize);
      }, 1000);

    });
  });
});