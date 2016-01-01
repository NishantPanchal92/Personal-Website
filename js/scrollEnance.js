UNCODE.scrollEnance = function() {
  /*!
   * Shim for MutationObserver interface
   * Author: Graeme Yeates (github.com/megawac)
   * Repository: https://github.com/megawac/MutationObserver.js
   * License: WTFPL V2, 2004 (wtfpl.net).
   * Though credit and staring the repo will make me feel pretty, you can modify and redistribute as you please.
   * Attempts to follow spec (http:// www.w3.org/TR/dom/#mutation-observers) as closely as possible for native javascript
   * See https://github.com/WebKit/webkit/blob/master/Source/WebCore/dom/MutationObserver.cpp for current webkit source c++ implementation
   */
  /**
   * prefix bugs:
      - https://bugs.webkit.org/show_bug.cgi?id=85161
      - https://bugzilla.mozilla.org/show_bug.cgi?id=749920
   * Don't use WebKitMutationObserver as Safari (6.0.5-6.1) use a buggy implementation
  */
  window.MutationObserver = window.MutationObserver || (function(undefined) {
    "use strict";
    /**
     * @param {function(Array.<MutationRecord>, MutationObserver)} listener
     * @constructor
     */
    function MutationObserver(listener) {
        /**
         * @type {Array.<Object>}
         * @private
         */
        this._watched = [];
        /** @private */
        this._listener = listener;
      }
      /**
       * Start a recursive timeout function to check all items being observed for mutations
       * @type {MutationObserver} observer
       * @private
       */
    function startMutationChecker(observer) {
        (function check() {
          var mutations = observer.takeRecords();
          if (mutations.length) { // fire away
            // calling the listener with context is not spec but currently consistent with FF and WebKit
            observer._listener(mutations, observer);
          }
          /** @private */
          observer._timeout = setTimeout(check, MutationObserver._period);
        })();
      }
      /**
       * Period to check for mutations (~32 times/sec)
       * @type {number}
       * @expose
       */
    MutationObserver._period = 30 /*ms+runtime*/ ;
    /**
     * Exposed API
     * @expose
     * @final
     */
    MutationObserver.prototype = {
      /**
       * see http:// dom.spec.whatwg.org/#dom-mutationobserver-observe
       * not going to throw here but going to follow the current spec config sets
       * @param {Node|null} $target
       * @param {Object|null} config : MutationObserverInit configuration dictionary
       * @expose
       * @return undefined
       */
      observe: function($target, config) {
        /**
         * Using slightly different names so closure can go ham
         * @type {!Object} : A custom mutation config
         */
        var settings = {
          attr: !!(config.attributes || config.attributeFilter || config.attributeOldValue),
          // some browsers are strict in their implementation that config.subtree and childList must be set together. We don't care - spec doesn't specify
          kids: !!config.childList,
          descendents: !!config.subtree,
          charData: !!(config.characterData || config.characterDataOldValue)
        };
        var watched = this._watched;
        // remove already observed target element from pool
        for (var i = 0; i < watched.length; i++) {
          if (watched[i].tar === $target) watched.splice(i, 1);
        }
        if (config.attributeFilter) {
          /**
           * converts to a {key: true} dict for faster lookup
           * @type {Object.<String,Boolean>}
           */
          settings.afilter = reduce(config.attributeFilter, function(a, b) {
            a[b] = true;
            return a;
          }, {});
        }
        watched.push({
          tar: $target,
          fn: createMutationSearcher($target, settings)
        });
        // reconnect if not connected
        if (!this._timeout) {
          startMutationChecker(this);
        }
      },
      /**
       * Finds mutations since last check and empties the "record queue" i.e. mutations will only be found once
       * @expose
       * @return {Array.<MutationRecord>}
       */
      takeRecords: function() {
        var mutations = [];
        var watched = this._watched;
        for (var i = 0; i < watched.length; i++) {
          watched[i].fn(mutations);
        }
        return mutations;
      },
      /**
       * @expose
       * @return undefined
       */
      disconnect: function() {
        this._watched = []; // clear the stuff being observed
        clearTimeout(this._timeout); // ready for garbage collection
        /** @private */
        this._timeout = null;
      }
    };
    /**
     * Simple MutationRecord pseudoclass. No longer exposing as its not fully compliant
     * @param {Object} data
     * @return {Object} a MutationRecord
     */
    function MutationRecord(data) {
        var settings = { // technically these should be on proto so hasOwnProperty will return false for non explicitly props
          type: null,
          target: null,
          addedNodes: [],
          removedNodes: [],
          previousSibling: null,
          nextSibling: null,
          attributeName: null,
          attributeNamespace: null,
          oldValue: null
        };
        for (var prop in data) {
          if (has(settings, prop) && data[prop] !== undefined) settings[prop] = data[prop];
        }
        return settings;
      }
      /**
       * Creates a func to find all the mutations
       *
       * @param {Node} $target
       * @param {!Object} config : A custom mutation config
       */
    function createMutationSearcher($target, config) {
        /** type {Elestuct} */
        var $oldstate = clone($target, config); // create the cloned datastructure
        /**
         * consumes array of mutations we can push to
         *
         * @param {Array.<MutationRecord>} mutations
         */
        return function(mutations) {
          var olen = mutations.length,
            dirty;
          // Alright we check base level changes in attributes... easy
          if (config.attr && $oldstate.attr) {
            findAttributeMutations(mutations, $target, $oldstate.attr, config.afilter);
          }
          // check childlist or subtree for mutations
          if (config.kids || config.descendents) {
            dirty = searchSubtree(mutations, $target, $oldstate, config);
          }
          // reclone data structure if theres changes
          if (dirty || mutations.length !== olen) {
            /** type {Elestuct} */
            $oldstate = clone($target, config);
          }
        };
      }
      /* attributes + attributeFilter helpers */
      /**
       * fast helper to check to see if attributes object of an element has changed
       * doesnt handle the textnode case
       *
       * @param {Array.<MutationRecord>} mutations
       * @param {Node} $target
       * @param {Object.<string, string>} $oldstate : Custom attribute clone data structure from clone
       * @param {Object} filter
       */
    function findAttributeMutations(mutations, $target, $oldstate, filter) {
        var checked = {};
        var attributes = $target.attributes;
        var attr;
        var name;
        var i = attributes.length;
        while (i--) {
          attr = attributes[i];
          name = attr.name;
          if (!filter || has(filter, name)) {
            if (attr.value !== $oldstate[name]) {
              // The pushing is redundant but gzips very nicely
              mutations.push(MutationRecord({
                type: "attributes",
                target: $target,
                attributeName: name,
                oldValue: $oldstate[name],
                attributeNamespace: attr.namespaceURI // in ie<8 it incorrectly will return undefined
              }));
            }
            checked[name] = true;
          }
        }
        for (name in $oldstate) {
          if (!(checked[name])) {
            mutations.push(MutationRecord({
              target: $target,
              type: "attributes",
              attributeName: name,
              oldValue: $oldstate[name]
            }));
          }
        }
      }
      /**
       * searchSubtree: array of mutations so far, element, element clone, bool
       * synchronous dfs comparision of two nodes
       * This function is applied to any observed element with childList or subtree specified
       * Sorry this is kind of confusing as shit, tried to comment it a bit...
       * codereview.stackexchange.com/questions/38351 discussion of an earlier version of this func
       *
       * @param {Array} mutations
       * @param {Node} $target
       * @param {!Object} $oldstate : A custom cloned node from clone()
       * @param {!Object} config : A custom mutation config
       */
    function searchSubtree(mutations, $target, $oldstate, config) {
        // Track if the tree is dirty and has to be recomputed (#14).
        var dirty;
        /*
         * Helper to identify node rearrangment and stuff...
         * There is no gaurentee that the same node will be identified for both added and removed nodes
         * if the positions have been shuffled.
         * conflicts array will be emptied by end of operation
         */
        function resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes) {
            // the distance between the first conflicting node and the last
            var distance = conflicts.length - 1;
            // prevents same conflict being resolved twice consider when two nodes switch places.
            // only one should be given a mutation event (note -~ is used as a math.ceil shorthand)
            var counter = -~((distance - numAddedNodes) / 2);
            var $cur;
            var oldstruct;
            var conflict;
            while ((conflict = conflicts.pop())) {
              $cur = $kids[conflict.i];
              oldstruct = $oldkids[conflict.j];
              // attempt to determine if there was node rearrangement... won't gaurentee all matches
              // also handles case where added/removed nodes cause nodes to be identified as conflicts
              if (config.kids && counter && Math.abs(conflict.i - conflict.j) >= distance) {
                mutations.push(MutationRecord({
                  type: "childList",
                  target: node,
                  addedNodes: [$cur],
                  removedNodes: [$cur],
                  // haha don't rely on this please
                  nextSibling: $cur.nextSibling,
                  previousSibling: $cur.previousSibling
                }));
                counter--; // found conflict
              }
              // Alright we found the resorted nodes now check for other types of mutations
              if (config.attr && oldstruct.attr) findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
              if (config.charData && $cur.nodeType === 3 && $cur.nodeValue !== oldstruct.charData) {
                mutations.push(MutationRecord({
                  type: "characterData",
                  target: $cur
                }));
              }
              // now look @ subtree
              if (config.descendents) findMutations($cur, oldstruct);
            }
          }
          /**
           * Main worker. Finds and adds mutations if there are any
           * @param {Node} node
           * @param {!Object} old : A cloned data structure using internal clone
           */
        function findMutations(node, old) {
          var $kids = node.childNodes;
          var $oldkids = old.kids;
          var klen = $kids.length;
          // $oldkids will be undefined for text and comment nodes
          var olen = $oldkids ? $oldkids.length : 0;
          // if (!olen && !klen) return; // both empty; clearly no changes
          // we delay the intialization of these for marginal performance in the expected case (actually quite signficant on large subtrees when these would be otherwise unused)
          // map of checked element of ids to prevent registering the same conflict twice
          var map;
          // array of potential conflicts (ie nodes that may have been re arranged)
          var conflicts;
          var id; // element id from getElementId helper
          var idx; // index of a moved or inserted element
          var oldstruct;
          // current and old nodes
          var $cur;
          var $old;
          // track the number of added nodes so we can resolve conflicts more accurately
          var numAddedNodes = 0;
          // iterate over both old and current child nodes at the same time
          var i = 0,
            j = 0;
          // while there is still anything left in $kids or $oldkids (same as i < $kids.length || j < $oldkids.length;)
          while (i < klen || j < olen) {
            // current and old nodes at the indexs
            $cur = $kids[i];
            oldstruct = $oldkids[j];
            $old = oldstruct && oldstruct.node;
            if ($cur === $old) { // expected case - optimized for this case
              // check attributes as specified by config
              if (config.attr && oldstruct.attr) /* oldstruct.attr instead of textnode check */ findAttributeMutations(mutations, $cur, oldstruct.attr, config.afilter);
              // check character data if node is a comment or textNode and it's being observed
              if (config.charData && oldstruct.charData !== undefined && $cur.nodeValue !== oldstruct.charData) {
                mutations.push(MutationRecord({
                  type: "characterData",
                  target: $cur
                }));
              }
              // resolve conflicts; it will be undefined if there are no conflicts - otherwise an array
              if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
              // recurse on next level of children. Avoids the recursive call when there are no children left to iterate
              if (config.descendents && ($cur.childNodes.length || oldstruct.kids && oldstruct.kids.length)) findMutations($cur, oldstruct);
              i++;
              j++;
            } else { // (uncommon case) lookahead until they are the same again or the end of children
              dirty = true;
              if (!map) { // delayed initalization (big perf benefit)
                map = {};
                conflicts = [];
              }
              if ($cur) {
                // check id is in the location map otherwise do a indexOf search
                if (!(map[id = getElementId($cur)])) { // to prevent double checking
                  // mark id as found
                  map[id] = true;
                  // custom indexOf using comparitor checking oldkids[i].node === $cur
                  if ((idx = indexOfCustomNode($oldkids, $cur, j)) === -1) {
                    if (config.kids) {
                      mutations.push(MutationRecord({
                        type: "childList",
                        target: node,
                        addedNodes: [$cur], // $cur is a new node
                        nextSibling: $cur.nextSibling,
                        previousSibling: $cur.previousSibling
                      }));
                      numAddedNodes++;
                    }
                  } else {
                    conflicts.push({ // add conflict
                      i: i,
                      j: idx
                    });
                  }
                }
                i++;
              }
              if ($old &&
                // special case: the changes may have been resolved: i and j appear congurent so we can continue using the expected case
                $old !== $kids[i]) {
                if (!(map[id = getElementId($old)])) {
                  map[id] = true;
                  if ((idx = indexOf($kids, $old, i)) === -1) {
                    if (config.kids) {
                      mutations.push(MutationRecord({
                        type: "childList",
                        target: old.node,
                        removedNodes: [$old],
                        nextSibling: $oldkids[j + 1], // praise no indexoutofbounds exception
                        previousSibling: $oldkids[j - 1]
                      }));
                      numAddedNodes--;
                    }
                  } else {
                    conflicts.push({
                      i: idx,
                      j: j
                    });
                  }
                }
                j++;
              }
            } // end uncommon case
          } // end loop
          // resolve any remaining conflicts
          if (conflicts) resolveConflicts(conflicts, node, $kids, $oldkids, numAddedNodes);
        }
        findMutations($target, $oldstate);
        return dirty;
      }
      /**
       * Utility
       * Cones a element into a custom data structure designed for comparision. https://gist.github.com/megawac/8201012
       *
       * @param {Node} $target
       * @param {!Object} config : A custom mutation config
       * @return {!Object} : Cloned data structure
       */
    function clone($target, config) {
        var recurse = true; // set true so childList we'll always check the first level
        return (function copy($target) {
          var elestruct = {
            /** @type {Node} */
            node: $target
          };
          // Store current character data of target text or comment node if the config requests
          // those properties to be observed.
          if (config.charData && ($target.nodeType === 3 || $target.nodeType === 8)) {
            elestruct.charData = $target.nodeValue;
          }
          // its either a element, comment, doc frag or document node
          else {
            // Add attr only if subtree is specified or top level and avoid if
            // attributes is a document object (#13).
            if (config.attr && recurse && $target.nodeType === 1) {
              /**
               * clone live attribute list to an object structure {name: val}
               * @type {Object.<string, string>}
               */
              elestruct.attr = reduce($target.attributes, function(memo, attr) {
                if (!config.afilter || config.afilter[attr.name]) {
                  memo[attr.name] = attr.value;
                }
                return memo;
              }, {});
            }
            // whether we should iterate the children of $target node
            if (recurse && ((config.kids || config.charData) || (config.attr && config.descendents))) {
              /** @type {Array.<!Object>} : Array of custom clone */
              elestruct.kids = map($target.childNodes, copy);
            }
            recurse = config.descendents;
          }
          return elestruct;
        })($target);
      }
      /**
       * indexOf an element in a collection of custom nodes
       *
       * @param {NodeList} set
       * @param {!Object} $node : A custom cloned node
       * @param {number} idx : index to start the loop
       * @return {number}
       */
    function indexOfCustomNode(set, $node, idx) {
        return indexOf(set, $node, idx, JSCompiler_renameProperty("node"));
      }
      // using a non id (eg outerHTML or nodeValue) is extremely naive and will run into issues with nodes that may appear the same like <li></li>
    var counter = 1; // don't use 0 as id (falsy)
    /** @const */
    var expando = "mo_id";
    /**
     * Attempt to uniquely id an element for hashing. We could optimize this for legacy browsers but it hopefully wont be called enough to be a concern
     *
     * @param {Node} $ele
     * @return {(string|number)}
     */
    function getElementId($ele) {
        try {
          return $ele.id || ($ele[expando] = $ele[expando] || counter++);
        } catch (o_O) { // ie <8 will throw if you set an unknown property on a text node
          try {
            return $ele.nodeValue; // naive
          } catch (shitie) { // when text node is removed: https://gist.github.com/megawac/8355978 :(
            return counter++;
          }
        }
      }
      /**
       * **map** Apply a mapping function to each item of a set
       * @param {Array|NodeList} set
       * @param {Function} iterator
       */
    function map(set, iterator) {
        var results = [];
        for (var index = 0; index < set.length; index++) {
          results[index] = iterator(set[index], index, set);
        }
        return results;
      }
      /**
       * **Reduce** builds up a single result from a list of values
       * @param {Array|NodeList|NamedNodeMap} set
       * @param {Function} iterator
       * @param {*} [memo] Initial value of the memo.
       */
    function reduce(set, iterator, memo) {
        for (var index = 0; index < set.length; index++) {
          memo = iterator(memo, set[index], index, set);
        }
        return memo;
      }
      /**
       * **indexOf** find index of item in collection.
       * @param {Array|NodeList} set
       * @param {Object} item
       * @param {number} idx
       * @param {string} [prop] Property on set item to compare to item
       */
    function indexOf(set, item, idx, prop) {
        for ( /*idx = ~~idx*/ ; idx < set.length; idx++) { // start idx is always given as this is internal
          if ((prop ? set[idx][prop] : set[idx]) === item) return idx;
        }
        return -1;
      }
      /**
       * @param {Object} obj
       * @param {(string|number)} prop
       * @return {boolean}
       */
    function has(obj, prop) {
        return obj[prop] !== undefined; // will be nicely inlined by gcc
      }
      // GCC hack see http:// stackoverflow.com/a/23202438/1517919
    function JSCompiler_renameProperty(a) {
      return a;
    }
    return MutationObserver;
  })(void 0);
  //
  // SmoothScroll for websites v1.4.0 (Balazs Galambosi)
  // http://www.smoothscroll.net/
  //
  // Licensed under the terms of the MIT license.
  //
  // You may use it in your theme if you credit me. 
  // It is also free to use on any individual website.
  //
  // Exception:
  // The only restriction is to not publish any  
  // extension for browsers or native application
  // without getting a written permission first.
  //
  (function() {
    // Scroll Variables (tweakable)
    var defaultOptions = {
      // Scrolling Core
      frameRate: 150, // [Hz]
      animationTime: 400, // [ms]
      stepSize: 100, // [px]
      // Pulse (less tweakable)
      // ratio of "tail" to "acceleration"
      pulseAlgorithm: true,
      pulseScale: 4,
      pulseNormalize: 1,
      // Acceleration
      accelerationDelta: 50, // 50
      accelerationMax: 3, // 3
      // Keyboard Settings
      keyboardSupport: true, // option
      arrowScroll: 50, // [px]
      // Other
      touchpadSupport: false, // ignore touchpad by default
      fixedBackground: true,
      excluded: ''
    };
    var options = defaultOptions;
    // Other Variables
    var isExcluded = false;
    var isFrame = false;
    var direction = {
      x: 0,
      y: 0
    };
    var initDone = false;
    var root = document.documentElement;
    var activeElement;
    var observer;
    var refreshSize;
    var deltaBuffer = [];
    var isMac = /^Mac/.test(navigator.platform);
    var key = {
      left: 37,
      up: 38,
      right: 39,
      down: 40,
      spacebar: 32,
      pageup: 33,
      pagedown: 34,
      end: 35,
      home: 36
    };
    /***********************************************
     * INITIALIZE
     ***********************************************/
    /**
     * Tests if smooth scrolling is allowed. Shuts down everything if not.
     */
    function initTest() {
        if (options.keyboardSupport) {
          addEvent('keydown', keydown);
        }
      }
      /**
       * Sets up scrolls array, determines if frames are involved.
       */
    function init() {
        if (initDone || !document.body) return;
        initDone = true;
        var body = document.body;
        var html = document.documentElement;
        var windowHeight = window.innerHeight;
        var scrollHeight = body.scrollHeight;
        // check compat mode for root element
        root = (document.compatMode.indexOf('CSS') >= 0) ? html : body;
        activeElement = body;
        initTest();
        // Checks if this script is running in a frame
        if (top != self) {
          isFrame = true;
        }
        /**
         * Please duplicate this radar for a Safari fix!
         * rdar://22376037
         * https://openradar.appspot.com/radar?id=4965070979203072
         *
         * Only applies to Safari now, Chrome fixed it in v45:
         * This fixes a bug where the areas left and right to
         * the content does not trigger the onmousewheel event
         * on some pages. e.g.: html, body { height: 100% }
         */
        else if (scrollHeight > windowHeight && (body.offsetHeight <= windowHeight || html.offsetHeight <= windowHeight)) {
          var fullPageElem = document.createElement('div');
          fullPageElem.style.cssText = 'position:absolute; z-index:-10000; ' + 'top:0; left:0; right:0; height:' + root.scrollHeight + 'px';
          document.body.appendChild(fullPageElem);
          // DOM changed (throttled) to fix height
          var pendingRefresh;
          refreshSize = function() {
            if (pendingRefresh) return; // could also be: clearTimeout(pendingRefresh);
            pendingRefresh = setTimeout(function() {
              if (isExcluded) return; // could be running after cleanup
              fullPageElem.style.height = '0';
              fullPageElem.style.height = root.scrollHeight + 'px';
              pendingRefresh = null;
            }, 500); // act rarely to stay fast
          };
          setTimeout(refreshSize, 10);
          addEvent('resize', refreshSize);
          // TODO: attributeFilter?
          var config = {
            attributes: true,
            childList: true,
            characterData: false
              // subtree: true
          };
          observer = new MutationObserver(refreshSize);
          observer.observe(body, config);
          if (root.offsetHeight <= windowHeight) {
            var clearfix = document.createElement('div');
            clearfix.style.clear = 'both';
            body.appendChild(clearfix);
          }
        }
        // disable fixed background
        if (!options.fixedBackground && !isExcluded) {
          body.style.backgroundAttachment = 'scroll';
          html.style.backgroundAttachment = 'scroll';
        }
      }
      /**
       * Removes event listeners and other traces left on the page.
       */
    function cleanup() {
        observer && observer.disconnect();
        removeEvent(wheelEvent, wheel);
        removeEvent('mousedown', mousedown);
        removeEvent('keydown', keydown);
        removeEvent('resize', refreshSize);
        removeEvent('load', init);
      }
      /************************************************
       * SCROLLING
       ************************************************/
    var que = [];
    var pending = false;
    var lastScroll = Date.now();
    /**
     * Pushes scroll actions to the scrolling queue.
     */
    function scrollArray(elem, left, top) {
        directionCheck(left, top);
        if (options.accelerationMax != 1) {
          var now = Date.now();
          var elapsed = now - lastScroll;
          if (elapsed < options.accelerationDelta) {
            var factor = (1 + (50 / elapsed)) / 2;
            if (factor > 1) {
              factor = Math.min(factor, options.accelerationMax);
              left *= factor;
              top *= factor;
            }
          }
          lastScroll = Date.now();
        }
        // push a scroll command
        que.push({
          x: left,
          y: top,
          lastX: (left < 0) ? 0.99 : -0.99,
          lastY: (top < 0) ? 0.99 : -0.99,
          start: Date.now()
        });
        // don't act if there's a pending queue
        if (pending) {
          return;
        }
        var scrollWindow = (elem === document.body);
        var step = function(time) {
          var now = Date.now();
          var scrollX = 0;
          var scrollY = 0;
          for (var i = 0; i < que.length; i++) {
            var item = que[i];
            var elapsed = now - item.start;
            var finished = (elapsed >= options.animationTime);
            // scroll position: [0, 1]
            var position = (finished) ? 1 : elapsed / options.animationTime;
            // easing [optional]
            if (options.pulseAlgorithm) {
              position = pulse(position);
            }
            // only need the difference
            var x = (item.x * position - item.lastX) >> 0;
            var y = (item.y * position - item.lastY) >> 0;
            // add this to the total scrolling
            scrollX += x;
            scrollY += y;
            // update last values
            item.lastX += x;
            item.lastY += y;
            // delete and step back if it's over
            if (finished) {
              que.splice(i, 1);
              i--;
            }
          }
          // scroll left and top
          if (scrollWindow) {
            window.scrollBy(scrollX, scrollY);
          } else {
            if (scrollX) elem.scrollLeft += scrollX;
            if (scrollY) elem.scrollTop += scrollY;
          }
          // clean up if there's nothing left to do
          if (!left && !top) {
            que = [];
          }
          if (que.length) {
            requestFrame(step, elem, (1000 / options.frameRate + 1));
          } else {
            pending = false;
          }
        };
        // start a new queue of actions
        requestFrame(step, elem, 0);
        pending = true;
      }
      /***********************************************
       * EVENTS
       ***********************************************/
      /**
       * Mouse wheel handler.
       * @param {Object} event
       */
    function wheel(event) {
        if (!initDone) {
          init();
        }
        var target = event.target;
        var overflowing = overflowingAncestor(target);
        // use default if there's no overflowing
        // element or default action is prevented   
        // or it's a zooming event with CTRL 
        if (!overflowing || event.defaultPrevented || event.ctrlKey) {
          return true;
        }
        // leave embedded content alone (flash & pdf)
        if (isNodeName(activeElement, 'embed') || (isNodeName(target, 'embed') && /\.pdf/i.test(target.src)) || isNodeName(activeElement, 'object')) {
          return true;
        }
        var deltaX = -event.wheelDeltaX || event.deltaX || 0;
        var deltaY = -event.wheelDeltaY || event.deltaY || 0;
        if (isMac) {
          if (event.wheelDeltaX && isDivisible(event.wheelDeltaX, 120)) {
            deltaX = -120 * (event.wheelDeltaX / Math.abs(event.wheelDeltaX));
          }
          if (event.wheelDeltaY && isDivisible(event.wheelDeltaY, 120)) {
            deltaY = -120 * (event.wheelDeltaY / Math.abs(event.wheelDeltaY));
          }
        }
        // use wheelDelta if deltaX/Y is not available
        if (!deltaX && !deltaY) {
          deltaY = -event.wheelDelta || 0;
        }
        // line based scrolling (Firefox mostly)
        if (event.deltaMode === 1) {
          deltaX *= 40;
          deltaY *= 40;
        }
        // check if it's a touchpad scroll that should be ignored
        if (!options.touchpadSupport && isTouchpad(deltaY)) {
          return true;
        }
        // scale by step size
        // delta is 120 most of the time
        // synaptics seems to send 1 sometimes
        if (Math.abs(deltaX) > 1.2) {
          deltaX *= options.stepSize / 120;
        }
        if (Math.abs(deltaY) > 1.2) {
          deltaY *= options.stepSize / 120;
        }
        scrollArray(overflowing, deltaX, deltaY);
        event.preventDefault();
        scheduleClearCache();
      }
      /**
       * Keydown event handler.
       * @param {Object} event
       */
    function keydown(event) {
        var target = event.target;
        var modifier = event.ctrlKey || event.altKey || event.metaKey || (event.shiftKey && event.keyCode !== key.spacebar);
        // our own tracked active element could've been removed from the DOM
        if (!document.contains(activeElement)) {
          activeElement = document.activeElement;
        }
        // do nothing if user is editing text
        // or using a modifier key (except shift)
        // or in a dropdown
        // or inside interactive elements
        var inputNodeNames = /^(textarea|select|embed|object)$/i;
        var buttonTypes = /^(button|submit|radio|checkbox|file|color|image)$/i;
        if (inputNodeNames.test(target.nodeName) || isNodeName(target, 'input') && !buttonTypes.test(target.type) || isNodeName(activeElement, 'video') || isInsideYoutubeVideo(event) || target.isContentEditable || event.defaultPrevented || modifier) {
          return true;
        }
        // spacebar should trigger button press
        if ((isNodeName(target, 'button') || isNodeName(target, 'input') && buttonTypes.test(target.type)) && event.keyCode === key.spacebar) {
          return true;
        }
        var shift, x = 0,
          y = 0;
        var elem = overflowingAncestor(activeElement);
        var clientHeight = elem.clientHeight;
        if (elem == document.body) {
          clientHeight = window.innerHeight;
        }
        switch (event.keyCode) {
          case key.up:
            y = -options.arrowScroll;
            break;
          case key.down:
            y = options.arrowScroll;
            break;
          case key.spacebar: // (+ shift)
            shift = event.shiftKey ? 1 : -1;
            y = -shift * clientHeight * 0.9;
            break;
          case key.pageup:
            y = -clientHeight * 0.9;
            break;
          case key.pagedown:
            y = clientHeight * 0.9;
            break;
          case key.home:
            y = -elem.scrollTop;
            break;
          case key.end:
            var damt = elem.scrollHeight - elem.scrollTop - clientHeight;
            y = (damt > 0) ? damt + 10 : 0;
            break;
          case key.left:
            x = -options.arrowScroll;
            break;
          case key.right:
            x = options.arrowScroll;
            break;
          default:
            return true; // a key we don't care about
        }
        scrollArray(elem, x, y);
        event.preventDefault();
        scheduleClearCache();
      }
      /**
       * Mousedown event only for updating activeElement
       */
    function mousedown(event) {
        activeElement = event.target;
      }
      /***********************************************
       * OVERFLOW
       ***********************************************/
    var uniqueID = (function() {
      var i = 0;
      return function(el) {
        return el.uniqueID || (el.uniqueID = i++);
      };
    })();
    var cache = {}; // cleared out after a scrolling session
    var clearCacheTimer;
    //setInterval(function () { cache = {}; }, 10 * 1000);
    function scheduleClearCache() {
      clearTimeout(clearCacheTimer);
      clearCacheTimer = setInterval(function() {
        cache = {};
      }, 1 * 1000);
    }

    function setCache(elems, overflowing) {
        for (var i = elems.length; i--;) cache[uniqueID(elems[i])] = overflowing;
        return overflowing;
      }
      //  (body)                (root)
      //         | hidden | visible | scroll |  auto  |
      // hidden  |   no   |    no   |   YES  |   YES  |
      // visible |   no   |   YES   |   YES  |   YES  |
      // scroll  |   no   |   YES   |   YES  |   YES  |
      // auto    |   no   |   YES   |   YES  |   YES  |
    function overflowingAncestor(el) {
      var elems = [];
      var body = document.body;
      var rootScrollHeight = root.scrollHeight;
      do {
        var cached = cache[uniqueID(el)];
        if (cached) {
          return setCache(elems, cached);
        }
        elems.push(el);
        if (rootScrollHeight === el.scrollHeight) {
          var topOverflowsNotHidden = overflowNotHidden(root) && overflowNotHidden(body);
          var isOverflowCSS = topOverflowsNotHidden || overflowAutoOrScroll(root);
          if (isFrame && isContentOverflowing(root) || !isFrame && isOverflowCSS) {
            return setCache(elems, getScrollRoot());
          }
        } else if (isContentOverflowing(el) && overflowAutoOrScroll(el)) {
          return setCache(elems, el);
        }
      } while (el = el.parentElement);
    }

    function isContentOverflowing(el) {
        return (el.clientHeight + 10 < el.scrollHeight);
      }
      // typically for <body> and <html>
    function overflowNotHidden(el) {
        var overflow = getComputedStyle(el, '').getPropertyValue('overflow-y');
        return (overflow !== 'hidden');
      }
      // for all other elements
    function overflowAutoOrScroll(el) {
        var overflow = getComputedStyle(el, '').getPropertyValue('overflow-y');
        return (overflow === 'scroll' || overflow === 'auto');
      }
      /***********************************************
       * HELPERS
       ***********************************************/
    function addEvent(type, fn) {
      window.addEventListener(type, fn, false);
    }

    function removeEvent(type, fn) {
      window.removeEventListener(type, fn, false);
    }

    function isNodeName(el, tag) {
      return (el.nodeName || '').toLowerCase() === tag.toLowerCase();
    }

    function directionCheck(x, y) {
      x = (x > 0) ? 1 : -1;
      y = (y > 0) ? 1 : -1;
      if (direction.x !== x || direction.y !== y) {
        direction.x = x;
        direction.y = y;
        que = [];
        lastScroll = 0;
      }
    }
    var deltaBufferTimer;
    if (window.localStorage && localStorage.SS_deltaBuffer) {
      deltaBuffer = localStorage.SS_deltaBuffer.split(',');
    }

    function isTouchpad(deltaY) {
      if (!deltaY) return;
      if (!deltaBuffer.length) {
        deltaBuffer = [deltaY, deltaY, deltaY];
      }
      deltaY = Math.abs(deltaY)
      deltaBuffer.push(deltaY);
      deltaBuffer.shift();
      clearTimeout(deltaBufferTimer);
      deltaBufferTimer = setTimeout(function() {
        if (window.localStorage) {
          localStorage.SS_deltaBuffer = deltaBuffer.join(',');
        }
      }, 1000);
      return !allDeltasDivisableBy(120) && !allDeltasDivisableBy(100);
    }

    function isDivisible(n, divisor) {
      return (Math.floor(n / divisor) == n / divisor);
    }

    function allDeltasDivisableBy(divisor) {
      return (isDivisible(deltaBuffer[0], divisor) && isDivisible(deltaBuffer[1], divisor) && isDivisible(deltaBuffer[2], divisor));
    }

    function isInsideYoutubeVideo(event) {
      var elem = event.target;
      var isControl = false;
      if (document.URL.indexOf('www.youtube.com/watch') != -1) {
        do {
          isControl = (elem.classList && elem.classList.contains('html5-video-controls'));
          if (isControl) break;
        } while (elem = elem.parentNode);
      }
      return isControl;
    }
    var requestFrame = (function() {
      return (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback, element, delay) {
        window.setTimeout(callback, delay || (1000 / 60));
      });
    })();
    var MutationObserver = (window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver);
    var getScrollRoot = (function() {
      var SCROLL_ROOT;
      return function() {
        if (!SCROLL_ROOT) {
          var dummy = document.createElement('div');
          dummy.style.cssText = 'height:10000px;width:1px;';
          document.body.appendChild(dummy);
          var bodyScrollTop = document.body.scrollTop;
          var docElScrollTop = document.documentElement.scrollTop;
          window.scrollBy(0, 1);
          if (document.body.scrollTop != bodyScrollTop)
            (SCROLL_ROOT = document.body);
          else(SCROLL_ROOT = document.documentElement);
          window.scrollBy(0, -1);
          document.body.removeChild(dummy);
        }
        return SCROLL_ROOT;
      };
    })();
    /***********************************************
     * PULSE (by Michael Herf)
     ***********************************************/
    /**
     * Viscous fluid with a pulse for part and decay for the rest.
     * - Applies a fixed force over an interval (a damped acceleration), and
     * - Lets the exponential bleed away the velocity over a longer interval
     * - Michael Herf, http://stereopsis.com/stopping/
     */
    function pulse_(x) {
      var val, start, expx;
      // test
      x = x * options.pulseScale;
      if (x < 1) { // acceleartion
        val = x - (1 - Math.exp(-x));
      } else { // tail
        // the previous animation ended here:
        start = Math.exp(-1);
        // simple viscous drag
        x -= 1;
        expx = 1 - Math.exp(-x);
        val = start + (expx * (1 - start));
      }
      return val * options.pulseNormalize;
    }

    function pulse(x) {
        if (x >= 1) return 1;
        if (x <= 0) return 0;
        if (options.pulseNormalize == 1) {
          options.pulseNormalize /= pulse_(1);
        }
        return pulse_(x);
      }
      /***********************************************
       * FIRST RUN
       ***********************************************/
    var userAgent = window.navigator.userAgent;
    var isEdge = /Edge/.test(userAgent); // thank you MS
    var isChrome = /chrome/i.test(userAgent) && !isEdge;
    var isSafari = /safari/i.test(userAgent) && !isEdge;
    var isMobile = /mobile/i.test(userAgent);
    var isEnabledForBrowser = (isChrome || isSafari) && !isMobile;
    var wheelEvent;
    if ('onwheel' in document.createElement('div')) wheelEvent = 'wheel';
    else if ('onmousewheel' in document.createElement('div')) wheelEvent = 'mousewheel';
    if (wheelEvent && isEnabledForBrowser) {
      addEvent(wheelEvent, wheel);
      addEvent('mousedown', mousedown);
      addEvent('load', init);
    }
    /***********************************************
     * PUBLIC INTERFACE
     ***********************************************/
    function SmoothScroll(optionsToSet) {
      for (var key in optionsToSet)
        if (defaultOptions.hasOwnProperty(key)) options[key] = optionsToSet[key];
    }
    SmoothScroll.destroy = cleanup;
    if (window.SmoothScrollOptions) // async API
      SmoothScroll(window.SmoothScrollOptions)
    if ('object' == typeof exports) module.exports = SmoothScroll;
    else window.SmoothScroll = SmoothScroll;
  })();
};
UNCODE.scrollEnance();