/* **********************************************
     Begin open.js
********************************************** */

(function($) {
    "use strict";
    var PANEL = window.PANEL || {},
          bulkArray = {};

    /* **********************************************
     Toggle panel
********************************************** */

    PANEL.toggle = function() {

        var $elopen = $('.panel_open'),
            $elclose = $('.panel_close'),
            $target = $('.theme_panel'),
            transitionEvent = whichTransitionEvent();

        var onEndTransitionFn = function(ev) {
            if (!$target.hasClass('opened')) $('.theme_panel_container', $target).hide();
        };
        if (transitionEvent) {
            $target[0].addEventListener(transitionEvent, onEndTransitionFn);
        } else {
            onEndTransitionFn();
        }
        $elopen.on("click", function(e) {
            e.preventDefault();
            $target.toggleClass("opened");
            if ($target.hasClass('opened')) $('.theme_panel_container', $target).show();
            return false;
        });
    };

    /* **********************************************
     Buttons
********************************************** */

    PANEL.buttons = function() {

        var $save = $('.panel_footer #saveCookies'),
            $saveOption = $('.panel_body .btn-save-option'),
            $boxedBack = $('.panel_body .boxed-back'),
            $reset = $('.panel_body #resetCookies');

        function createCookie(name,value,days) {
            if (days) {
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var expires = "; expires="+date.toGMTString();
            }
            else var expires = "";
            document.cookie = name+"="+value+expires+"; path=/";
        }
        function eraseCookie(name) {
            createCookie(name,"",-1);
        }

        $saveOption.on("click", function(e) {
            var getData = $(e.currentTarget).data();
            createCookie(getData.id, getData.value);
            //if (getData.full != undefined) createCookie('_uncode_menu_full', getData.full);
            window.location.href = window.location.href.match(/^[^\#\?]+/)[0];
            // $.each(bulkArray, function(index, value) {
            //     document.cookie = index + value;
            // });
            // window.location.href = window.location.href.match(/^[^\#\?]+/)[0];
            //location.reload();
        });

        $boxedBack.on("click", function(e) {
            var getData = $(e.currentTarget).data(),
            getSrc = $(e.currentTarget).attr('img-src'),
            backArray = String(getData.back).split(",");
            backArray[backArray.length-1] = getData.id;
            $('.box-wrapper').css({
                'background-image': 'url('+getSrc+')',
                'background-size': 'cover',
                'background-attachment': 'fixed'
            });
            $('.panel_section .boxed-back.btn-disable-hover').removeClass('btn-disable-hover');
            $(e.currentTarget).addClass('btn-disable-hover');
            createCookie('_uncode_body_background', backArray.join(','));
        });

        var $boxedWidth = $('.theme_panel #boxed-range'),
        $style = $("<style type='text/css'>").appendTo('head');

        function changeWidth(value) {
            var css = "\
                .limit-width {\
                    max-width:   "+value+"px;\
                }";
            $style.html(css);
            window.dispatchEvent(UNCODE.boxEvent);
            if (document.createEvent) {
                window.dispatchEvent( new Event('resize') );
            }else{
                document.body.fireEvent('onresize');
            }
        }

        $boxedWidth.on("change", function(e) {
            changeWidth($(this).attr('value'));
            createCookie('_uncode_main_width', $(this).attr('value')+',px');
        });

        $reset.on("click", function(e) {
            var cookies = document.cookie.split(";");
            for (var i = 0; i < cookies.length; i++) {
                var getTheCookie = cookies[i].split("=")[0];
                if (getTheCookie.indexOf("_uncode") > -1) eraseCookie(getTheCookie);
            }
            var href = document.location.href;
            var new_url;
            var index = href.indexOf('?');
            if (index > 0) {
                new_url = href.substring(0, index);
            }

            window.location.href = new_url; //location.reload();
        });
    };

    /* **********************************************
     Select
********************************************** */

    PANEL.select = function() {

        var $el = $('.theme_panel select');

        $el.each(function() {
            $(this).on("change", function(e) {
                bulkArray[$(this).attr('data-id')] = '=' + $(this).attr('value') + "; expires=0; path=/";
            });
        });

    };

    /* **********************************************
     Input
********************************************** */

    PANEL.input = function() {

        var $el = $('.theme_panel input[type="text"], .theme_panel input[type="number"]');

        $el.each(function() {
            $(this).on("input", function(e) {
                bulkArray[$(this).attr('data-id')] = '=' + $(this).val() + "; expires=0; path=/";
            });
        });

    };

    /* **********************************************
     Switch
********************************************** */

    PANEL.switch = function() {

        var $el = $('.theme_panel input[type=checkbox]');

        $el.each(function() {
            $(this).on("change", function(e) {
                if ($(this).is(':checked') == true) {
                    bulkArray[$(this).attr('data-id')] = '=on; expires=0; path=/';
                } else {
                    bulkArray[$(this).attr('data-id')] = '=off; expires=0; path=/';
                }

                if ($(this).attr('data-id') == '_uncode_boxed') {
                    if($('.boxed-box').css('display')=='none') {
                        $('.boxed-box').show();
                    } else $('.boxed-box').hide();
                }
            });
        });

    };


    /* **********************************************
     Color
********************************************** */

    PANEL.color = function() {

        var options = {
            color: false,
            mode: 'hsl',
            controls: {
                horiz: 's', // horizontal defaults to saturation
                vert: 'l', // vertical defaults to lightness
                strip: 'h' // right strip defaults to hue
            },
            hide: true, // hide the color picker by default
            border: true, // draw a border around the collection of UI elements
            target: false, // a DOM element / jQuery selector that the element will be appended within. Only used when called on an input.
            width: 200, // the width of the collection of UI elements
            palettes: true, // show a palette of basic colors beneath the square.
            change: function(event, ui) {
                // event = standard jQuery event, produced by whichever control was changed.
                // ui = standard jQuery UI object, with a color member containing a Color.js object

                // change the headline color
                bulkArray[$(this).attr('data-id')] = '=' + $(this).val() + '; expires=0; path=/';
            }
        }

        $('.color-picker').iris(options);
    };

    /* **********************************************
     Begin app.js
********************************************** */

    PANEL.init = function() {
        PANEL.toggle();
        //PANEL.input();
        //PANEL.select();
        //PANEL.switch();
        //PANEL.color();
        PANEL.buttons();
    }

    $(function() {
        PANEL.init();
    });

})(jQuery);
