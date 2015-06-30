(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Angular Grid
// Written by Niall Crosby
// www.angulargrid.com
//
// Version 1.10.1

(function() {

    // Establish the root object, `window` or `exports`
    var root = this;
    var Grid = require('./grid');

    // if angular is present, register the directive
    if (typeof angular !== 'undefined') {
        var angularModule = angular.module("angularGrid", []);
        angularModule.directive("angularGrid", function() {
            return {
                restrict: "A",
                controller: ['$element', '$scope', '$compile', AngularDirectiveController],
                scope: {
                    angularGrid: "="
                }
            };
        });
        angularModule.directive("agGrid", function() {
            return {
                restrict: "A",
                controller: ['$element', '$scope', '$compile', '$attrs', AngularDirectiveController],
                scope: true
            };
        });
    }

    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = angularGridGlobalFunction;
        }
        exports.angularGrid = angularGridGlobalFunction;
    }

    root.angularGrid = angularGridGlobalFunction;

    function AngularDirectiveController($element, $scope, $compile, $attrs) {
        var gridOptions;
        var quickFilterOnScope;
        if ($attrs) {
            // new directive of ag-grid
            var keyOfGridInScope = $attrs.agGrid;
            quickFilterOnScope = keyOfGridInScope + '.quickFilterText';
            gridOptions = $scope.$eval(keyOfGridInScope);
            if (!gridOptions) {
                console.warn("WARNING - grid options for Angular Grid not found. Please ensure the attribute ag-grid points to a valid object on the scope");
                return;
            }
        } else {
            // old directive of angular-grid
            console.warn("WARNING - Directive angular-grid is deprecated, you should use the ag-grid directive instead.");
            gridOptions = $scope.angularGrid;
            quickFilterOnScope = 'angularGrid.quickFilterText';
            if (!gridOptions) {
                console.warn("WARNING - grid options for Angular Grid not found. Please ensure the attribute angular-grid points to a valid object on the scope");
                return;
            }
        }

        var eGridDiv = $element[0];
        var grid = new Grid(eGridDiv, gridOptions, $scope, $compile, quickFilterOnScope);

        $scope.$on("$destroy", function() {
            grid.setFinished();
        });
    }

    // Global Function - this function is used for creating a grid, outside of any AngularJS
    function angularGridGlobalFunction(element, gridOptions) {
        // see if element is a query selector, or a real element
        var eGridDiv;
        if (typeof element === 'string') {
            eGridDiv = document.querySelector(element);
            if (!eGridDiv) {
                console.warn('WARNING - was not able to find element ' + element + ' in the DOM, Angular Grid initialisation aborted.');
                return;
            }
        } else {
            eGridDiv = element;
        }
        new Grid(eGridDiv, gridOptions, null, null);
    }

}).call(window);

},{"./grid":15}],2:[function(require,module,exports){
var SvgFactory = require('../svgFactory');
var utils = require('../utils');
var constants = require('../constants');
var svgFactory = new SvgFactory();

function groupCellRendererFactory(gridOptionsWrapper, selectionRendererFactory) {

    return function groupCellRenderer(params) {

        var eGroupCell = document.createElement('span');
        var node = params.node;

        var cellExpandable = node.group && !node.footer;
        if (cellExpandable) {
            addExpandAndContract(eGroupCell, params);
        }

        var checkboxNeeded = params.colDef && params.colDef.cellRenderer && params.colDef.cellRenderer.checkbox && !node.footer;
        if (checkboxNeeded) {
            var eCheckbox = selectionRendererFactory.createSelectionCheckbox(node, params.rowIndex);
            eGroupCell.appendChild(eCheckbox);
        }

        if (params.colDef && params.colDef.cellRenderer && params.colDef.cellRenderer.innerRenderer) {
            createFromInnerRenderer(eGroupCell, params, params.colDef.cellRenderer.innerRenderer);
        } else if (node.footer) {
            createFooterCell(eGroupCell, params);
        } else if (node.group) {
            createGroupCell(eGroupCell, params);
        } else {
            createLeafCell(eGroupCell, params);
        }

        // only do this if an indent - as this overwrites the padding that
        // the theme set, which will make things look 'not aligned' for the
        // first group level.
        if (node.footer || node.level > 0) {
            var paddingPx = node.level * 10;
            if (node.footer) {
                paddingPx += 10;
            } else if (!node.group) {
                paddingPx += 5;
            }
            eGroupCell.style.paddingLeft = paddingPx + 'px';
        }

        return eGroupCell;
    };

    function addExpandAndContract(eGroupCell, params) {

        var eExpandIcon = createGroupExpandIcon(true);
        var eContractIcon = createGroupExpandIcon(false);
        eGroupCell.appendChild(eExpandIcon);
        eGroupCell.appendChild(eContractIcon);

        eExpandIcon.addEventListener('click', expandOrContract);
        eContractIcon.addEventListener('click', expandOrContract);
        eGroupCell.addEventListener('dblclick', expandOrContract);

        showAndHideExpandAndContract(eExpandIcon, eContractIcon, params.node.expanded);

        // if parent cell was passed, then we can listen for when focus is on the cell,
        // and then expand / contract as the user hits enter or space-bar
        if (params.eGridCell) {
            params.eGridCell.addEventListener('keydown', function(event) {
                if (utils.isKeyPressed(event, constants.KEY_ENTER)) {
                    expandOrContract();
                    event.preventDefault();
                }
            });
        }

        function expandOrContract() {
            expandGroup(eExpandIcon, eContractIcon, params);
        }
    }

    function showAndHideExpandAndContract(eExpandIcon, eContractIcon, expanded) {
        utils.setVisible(eExpandIcon, !expanded);
        utils.setVisible(eContractIcon, expanded);
    }

    function createFromInnerRenderer(eGroupCell, params, renderer) {
        utils.useRenderer(eGroupCell, renderer, params);
    }

    function expandGroup(eExpandIcon, eContractIcon, params) {
        params.node.expanded = !params.node.expanded;
        params.api.onGroupExpandedOrCollapsed(params.rowIndex + 1);
        showAndHideExpandAndContract(eExpandIcon, eContractIcon, params.node.expanded);
    }

    function createGroupExpandIcon(expanded) {
        var eIcon;
        if (expanded) {
            eIcon = utils.createIcon('groupContracted', gridOptionsWrapper, null, svgFactory.createArrowRightSvg);
        } else {
            eIcon = utils.createIcon('groupExpanded', gridOptionsWrapper, null, svgFactory.createArrowDownSvg);
        }
        utils.addCssClass(eIcon, 'ag-group-expand');
        return eIcon;
    }

    // creates cell with 'Total {{key}}' for a group
    function createFooterCell(eGroupCell, params) {
        var textToDisplay = "Total " + getGroupName(params);
        var eText = document.createTextNode(textToDisplay);
        eGroupCell.appendChild(eText);
    }

    function getGroupName(params) {
        var cellRenderer = params.colDef.cellRenderer;
        if (cellRenderer && cellRenderer.keyMap
            && typeof cellRenderer.keyMap === 'object' && params.colDef.cellRenderer !== null) {
            var valueFromMap = cellRenderer.keyMap[params.node.key];
            if (valueFromMap) {
                return valueFromMap;
            } else {
                return params.node.key;
            }
        } else {
            return params.node.key;
        }
    }

    // creates cell with '{{key}} ({{childCount}})' for a group
    function createGroupCell(eGroupCell, params) {
        var groupName = getGroupName(params);

        var colDefOfGroupedCol = params.api.getColumnDef(params.node.field);
        if (colDefOfGroupedCol && typeof colDefOfGroupedCol.cellRenderer === 'function') {
            params.value = groupName;
            utils.useRenderer(eGroupCell, colDefOfGroupedCol.cellRenderer, params);
        } else {
            eGroupCell.appendChild(document.createTextNode(groupName));
        }

        // only include the child count if it's included, eg if user doing custom aggregation,
        // then this could be left out, or set to -1, ie no child count
        var suppressCount = params.colDef.cellRenderer && params.colDef.cellRenderer.suppressCount;
        if (!suppressCount && params.node.allChildrenCount >= 0) {
            eGroupCell.appendChild(document.createTextNode(" (" + params.node.allChildrenCount + ")"));
        }
    }

    // creates cell with '{{key}} ({{childCount}})' for a group
    function createLeafCell(eParent, params) {
        if (params.value) {
            var eText = document.createTextNode(' ' + params.value);
            eParent.appendChild(eText);
        }
    }
}

module.exports = groupCellRendererFactory;
},{"../constants":4,"../svgFactory":33,"../utils":38}],3:[function(require,module,exports){
var constants = require('./constants');
var utils = require('./utils');

function ColumnController() {
    this.listeners = [];
    this.createModel();
}

ColumnController.prototype.init = function(angularGrid, selectionRendererFactory, gridOptionsWrapper, expressionService) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.selectionRendererFactory = selectionRendererFactory;
    this.expressionService = expressionService;
};

ColumnController.prototype.createModel = function() {
    var that = this;
    this.model = {
        // used by:
        // + inMemoryRowController -> sorting, building quick filter text
        // + headerRenderer -> sorting (clearing icon)
        getAllColumns: function() {
            return that.allColumns;
        },
        // + rowController -> while inserting rows, and when tabbing through cells (need to change this)
        // need a newMethod - get next col index
        getDisplayedColumns: function() {
            return that.displayedColumns;
        },
        // + toolPanel
        getGroupedColumns: function() {
            return that.groupedColumns;
        },
        // used by:
        // + angularGrid -> for setting body width
        // + rowController -> setting main row widths (when inserting and resizing)
        getBodyContainerWidth: function() {
            return that.getTotalColWidth(false);
        },
        // used by:
        // + angularGrid -> setting pinned body width
        getPinnedContainerWidth: function() {
            return that.getTotalColWidth(true);
        },
        // used by:
        // + headerRenderer -> setting pinned body width
        getHeaderGroups: function() {
            return that.headerGroups;
        },
        // used by:
        // + api.getFilterModel() -> to map colDef to column, key can be colDef or field
        getColumn: function(key) {
            return that.getColumn(key);
        },
        // HB extension
        // used by:
        // + grid -> scrollToColumnIndex
        getOffsetForColumnIndex: function(colIndex) {
            var offset = 0;
            var min = Math.min(colIndex, that.allColumns.length);
            for (var i = 0; i < min; i++) {
                var col = that.allColumns[i];
                if (!col.pinned && that.displayedColumns.indexOf(col) >= 0) {
                    offset += col.actualWidth;
                }
            }

            return offset;
        },
        // used by:
        // + rowRenderer -> for navigation
        getVisibleColBefore: function(col) {
            var oldIndex = that.visibleColumns.indexOf(col);
            if (oldIndex > 0) {
                return that.visibleColumns[oldIndex - 1];
            } else {
                return null;
            }
        },
        // used by:
        // + rowRenderer -> for navigation
        getVisibleColAfter: function(col) {
            var oldIndex = that.visibleColumns.indexOf(col);
            if (oldIndex < (that.visibleColumns.length - 1)) {
                return that.visibleColumns[oldIndex + 1];
            } else {
                return null;
            }
        },
        getDisplayNameForCol: function(column) {
            return that.getDisplayNameForCol(column);
        }
    };
};

ColumnController.prototype.getColumn = function(key) {
    for (var i = 0; i<this.allColumns.length; i++) {
        var colDefMatches = this.allColumns[i].colDef === key;
        var fieldMatches = this.allColumns[i].colDef.field === key;
        if (colDefMatches || fieldMatches) {
            return this.allColumns[i];
        }
    }
};

ColumnController.prototype.getDisplayNameForCol = function(column) {

    var colDef = column.colDef;
    var headerValueGetter = colDef.headerValueGetter;

    if (headerValueGetter) {
        var params = {
            colDef: colDef,
            api: this.gridOptionsWrapper.getApi(),
            context: this.gridOptionsWrapper.getContext()
        };

        if (typeof headerValueGetter === 'function') {
            // valueGetter is a function, so just call it
            return headerValueGetter(params);
        } else if (typeof headerValueGetter === 'string') {
            // valueGetter is an expression, so execute the expression
            return this.expressionService.evaluate(headerValueGetter, params);
        }

        return utils.getValue(this.expressionService, undefined, colDef, undefined, api, context);
    } else if (colDef.displayName) {
        console.warn("ag-grid: Found displayName " + colDef.displayName + ", please use headerName instead, displayName is deprecated.");
        return colDef.displayName;
    } else {
        return colDef.headerName;
    }
};

ColumnController.prototype.addListener = function(listener) {
    this.listeners.push(listener);
};

ColumnController.prototype.fireColumnsChanged = function() {
    for (var i = 0; i<this.listeners.length; i++) {
        this.listeners[i].columnsChanged(this.allColumns, this.groupedColumns);
    }
};

ColumnController.prototype.getModel = function() {
    return this.model;
};

// called by angularGrid
ColumnController.prototype.setColumns = function(columnDefs) {
    this.checkForDeprecatedItems(columnDefs);
    this.createColumns(columnDefs);
    this.createAggColumns();
    this.updateModel();
    this.fireColumnsChanged();
};

ColumnController.prototype.checkForDeprecatedItems = function(columnDefs) {
    if (columnDefs) {
        for (var i = 0; i<columnDefs.length; i++) {
            var colDef = columnDefs[i];
            if (colDef.group !== undefined) {
                console.warn('ag-grid: ' + colDef.field + ' colDef.group is deprecated, please use colDef.headerGroup');
                colDef.headerGroup = colDef.group;
            }
            if (colDef.groupShow !== undefined) {
                console.warn('ag-grid: ' + colDef.field + ' colDef.groupShow is deprecated, please use colDef.headerGroupShow');
                colDef.headerGroupShow = colDef.groupShow;
            }
        }
    }
};

// called by headerRenderer - when a header is opened or closed
ColumnController.prototype.headerGroupOpened = function(group) {
    this.setGroupOpened(group, !group.expanded);
};

ColumnController.prototype.setGroupOpened = function(group, open) {
    group.expanded = open;
    this.updateGroups();
    this.updateDisplayedColumns();
    if (this.groupListener) {
        this.groupListener(group);
    }
    this.angularGrid.refreshHeaderAndBody();
};

// HB extension
ColumnController.prototype.openCloseAllHeaderGroups = function(open) {
    var groups = this.headerGroups;
    for (var i = 0; i < groups.length; i++) {
        if (groups[i].expandable) {
            groups[i].expanded = open;
        }
    }
    this.updateGroups();
    this.updateDisplayedColumns();
    this.angularGrid.refreshHeaderAndBody();
};
// older name for backward compatibility
ColumnController.prototype.openCloseAllColumnGroups = ColumnController.prototype.openCloseAllHeaderGroups;

// HB extension
ColumnController.prototype.openCloseGroupByName = function(name, open) {
    var groups = this.columnGroups;
    for (var i = 0; i < groups.length; i++) {
        if (groups[i].name === name) {
            this.setGroupOpened(groups[i], open);
            break;
        }
    }
};

// HB extension
ColumnController.prototype.registerGroupListener = function(listener) {
    this.groupListener = listener;
};

// called by toolPanel - when change in columns happens
ColumnController.prototype.onColumnStateChanged = function() {
    this.updateModel();
    this.angularGrid.refreshHeaderAndBody();
};

// called from API
ColumnController.prototype.hideColumns = function(colIds, hide) {
    for (var i = 0; i<this.allColumns.length; i++) {
        var idThisCol = this.allColumns[i].colId;
        var hideThisCol = colIds.indexOf(idThisCol) >= 0;
        if (hideThisCol) {
            this.allColumns[i].visible = !hide;
        }
    }
    this.onColumnStateChanged();
    this.fireColumnsChanged(); // to tell toolbar
};

ColumnController.prototype.updateModel = function() {
    this.updateVisibleColumns();
    this.updatePinnedColumns();
    this.buildGroups();
    this.updateGroups();
    this.updateDisplayedColumns();
};

// private
ColumnController.prototype.updateDisplayedColumns = function() {

    if (!this.gridOptionsWrapper.isGroupHeaders()) {
        // if not grouping by headers, then pull visible cols
        this.displayedColumns = this.visibleColumns;
    } else {
        // if grouping, then only show col as per group rules
        this.displayedColumns = [];
        for (var i = 0; i < this.headerGroups.length; i++) {
            var group = this.headerGroups[i];
            group.addToVisibleColumns(this.displayedColumns);
        }
    }

};

// public - called from api
ColumnController.prototype.sizeColumnsToFit = function(gridWidth) {
    // avoid divide by zero
    if (gridWidth <= 0 || this.displayedColumns.length === 0) {
        return;
    }

    var columnStartWidth = 0; // will contain the starting total width of the cols been spread
    var colsToSpread = []; // all visible cols, except those with avoidSizeToFit
    var widthForSpreading = gridWidth; // grid width minus the columns we are not resizing

    // get the list of cols to work with
    for (var j = 0; j < this.displayedColumns.length ; j++) {
        if (this.displayedColumns[j].colDef.suppressSizeToFit === true) {
            // don't include col, and remove the width from teh available width
            widthForSpreading -= this.displayedColumns[j].actualWidth;
        } else {
            // include the col
            colsToSpread.push(this.displayedColumns[j]);
            columnStartWidth += this.displayedColumns[j].actualWidth;
        }
    }

    // if no width left over to spread with, do nothing
    if (widthForSpreading <= 0) {
        return;
    }

    var scale = widthForSpreading / columnStartWidth;
    var pixelsForLastCol = widthForSpreading;

    // size all cols except the last by the scale
    for (var i = 0; i < (colsToSpread.length - 1); i++) {
        var column = colsToSpread[i];
        var newWidth = parseInt(column.actualWidth * scale);
        column.actualWidth = newWidth;
        pixelsForLastCol -= newWidth;
    }

    // size the last by whats remaining (this avoids rounding errors that could
    // occur with scaling everything, where it result in some pixels off)
    var lastColumn = colsToSpread[colsToSpread.length - 1];
    lastColumn.actualWidth = pixelsForLastCol;

    // widths set, refresh the gui
    this.angularGrid.refreshHeaderAndBody();
};

// private
ColumnController.prototype.buildGroups = function() {
    // if not grouping by headers, do nothing
    if (!this.gridOptionsWrapper.isGroupHeaders()) {
        this.headerGroups = null;
        return;
    }

    // split the columns into groups
    var currentGroup = null;
    this.headerGroups = [];
    var that = this;

    var lastColWasPinned = true;

    this.visibleColumns.forEach(function(column) {
        // do we need a new group, because we move from pinned to non-pinned columns?
        var endOfPinnedHeader = lastColWasPinned && !column.pinned;
        if (!column.pinned) {
            lastColWasPinned = false;
        }
        // do we need a new group, because the group names doesn't match from previous col?
        var groupKeyMismatch = currentGroup && column.colDef.headerGroup !== currentGroup.name;
        // we don't group columns where no group is specified
        var colNotInGroup = currentGroup && !currentGroup.name;
        // do we need a new group, because we are just starting
        var processingFirstCol = currentGroup === null;
        var newGroupNeeded = processingFirstCol || endOfPinnedHeader || groupKeyMismatch || colNotInGroup;
        // create new group, if it's needed
        if (newGroupNeeded) {
            var pinned = column.pinned;
            currentGroup = new headerGroup(pinned, column.colDef.headerGroup);
            that.headerGroups.push(currentGroup);
        }
        currentGroup.addColumn(column);
    });
};

// private
ColumnController.prototype.updateGroups = function() {
    // if not grouping by headers, do nothing
    if (!this.gridOptionsWrapper.isGroupHeaders()) {
        return;
    }

    for (var i = 0; i < this.headerGroups.length; i++) {
        var group = this.headerGroups[i];
        group.calculateExpandable();
        group.calculateDisplayedColumns();
    }
};

// private
ColumnController.prototype.updateVisibleColumns = function() {
    this.visibleColumns = [];

    var needAGroupColumn = this.groupedColumns.length > 0
        && !this.gridOptionsWrapper.isGroupSuppressAutoColumn()
        && !this.gridOptionsWrapper.isGroupUseEntireRow();

    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();

    if (needAGroupColumn) {
        // if one provided by user, use it, otherwise create one
        var groupColDef = this.gridOptionsWrapper.getGroupColumnDef();
        if (!groupColDef) {
            groupColDef = {
                headerName: localeTextFunc('group','Group'),
                cellRenderer: {
                    renderer: "group"
                }
            };
        }
        // no group column provided, need to create one here
        var groupColumn = new Column(groupColDef, this.gridOptionsWrapper.getColWidth());
        this.visibleColumns.push(groupColumn);
    }

    for (var i = 0; i < this.allColumns.length; i++) {
        var column = this.allColumns[i];
        if (column.visible) {
            column.index = this.visibleColumns.length;
            this.visibleColumns.push(this.allColumns[i]);
        }
    }
};

// private
ColumnController.prototype.updatePinnedColumns = function() {
    var pinnedColumnCount = this.gridOptionsWrapper.getPinnedColCount();
    for (var i = 0; i < this.visibleColumns.length; i++) {
        var pinned = i < pinnedColumnCount;
        this.visibleColumns[i].pinned = pinned;
    }
};

// private
ColumnController.prototype.createColumns = function(columnDefs) {
    this.allColumns = [];
    var that = this;
    if (columnDefs) {
        for (var i = 0; i < columnDefs.length; i++) {
            var colDef = columnDefs[i];
            // this is messy - we swap in another col def if it's checkbox selection - not happy :(
            if (colDef === 'checkboxSelection') {
                colDef = that.selectionRendererFactory.createCheckboxColDef();
            }
            var width = that.calculateColInitialWidth(colDef);
            var column = new Column(colDef, width);
            that.allColumns.push(column);
        }
    }
};

// private
ColumnController.prototype.createAggColumns = function() {
    this.groupedColumns = [];
    var groupKeys = this.gridOptionsWrapper.getGroupKeys();
    if (!groupKeys || groupKeys.length <= 0) {
        return;
    }
    for (var i = 0; i < groupKeys.length; i++) {
        var groupKey = groupKeys[i];
        var column = this.getColumn(groupKey);
        if (!column) {
            column = this.createDummyColumn(groupKey);
        }
        this.groupedColumns.push(column);
    }
};

// private
ColumnController.prototype.createDummyColumn = function(field) {
    var colDef = {
        field: field,
        headerName: field,
        hide: false
    };
    var width = this.gridOptionsWrapper.getColWidth();
    var column = new Column(colDef, width);
    return column;
};

// private
ColumnController.prototype.calculateColInitialWidth = function(colDef) {
    if (!colDef.width) {
        // if no width defined in colDef, use default
        return this.gridOptionsWrapper.getColWidth();
    } else if (colDef.width < constants.MIN_COL_WIDTH) {
        // if width in col def to small, set to min width
        return constants.MIN_COL_WIDTH;
    } else {
        // otherwise use the provided width
        return colDef.width;
    }
};

// private
// call with true (pinned), false (not-pinned) or undefined (all columns)
ColumnController.prototype.getTotalColWidth = function(includePinned) {
    var widthSoFar = 0;
    var pinedNotImportant = typeof includePinned !== 'boolean';

    this.displayedColumns.forEach(function(column) {
        var includeThisCol = pinedNotImportant || column.pinned === includePinned;
        if (includeThisCol) {
            widthSoFar += column.actualWidth;
        }
    });

    return widthSoFar;
};

function headerGroup(pinned, name) {
    this.pinned = pinned;
    this.name = name;
    this.allColumns = [];
    this.displayedColumns = [];
    this.expandable = false; // whether this group can be expanded or not
    this.expanded = false;
}

headerGroup.prototype.addColumn = function(column) {
    this.allColumns.push(column);
};

// need to check that this group has at least one col showing when both expanded and contracted.
// if not, then we don't allow expanding and contracting on this group
headerGroup.prototype.calculateExpandable = function() {
    // want to make sure the group doesn't disappear when it's open
    var atLeastOneShowingWhenOpen = false;
    // want to make sure the group doesn't disappear when it's closed
    var atLeastOneShowingWhenClosed = false;
    // want to make sure the group has something to show / hide
    var atLeastOneChangeable = false;
    for (var i = 0, j = this.allColumns.length; i < j; i++) {
        var column = this.allColumns[i];
        if (column.colDef.headerGroupShow === 'open') {
            atLeastOneShowingWhenOpen = true;
            atLeastOneChangeable = true;
        } else if (column.colDef.headerGroupShow === 'closed') {
            atLeastOneShowingWhenClosed = true;
            atLeastOneChangeable = true;
        } else {
            atLeastOneShowingWhenOpen = true;
            atLeastOneShowingWhenClosed = true;
        }
    }

    this.expandable = atLeastOneShowingWhenOpen && atLeastOneShowingWhenClosed && atLeastOneChangeable;
};

headerGroup.prototype.calculateDisplayedColumns = function() {
    // clear out last time we calculated
    this.displayedColumns = [];
    // it not expandable, everything is visible
    if (!this.expandable) {
        this.displayedColumns = this.allColumns;
        return;
    }
    // and calculate again
    for (var i = 0, j = this.allColumns.length; i < j; i++) {
        var column = this.allColumns[i];
        switch (column.colDef.headerGroupShow) {
            case 'open':
                // when set to open, only show col if group is open
                if (this.expanded) {
                    this.displayedColumns.push(column);
                }
                break;
            case 'closed':
                // when set to open, only show col if group is open
                if (!this.expanded) {
                    this.displayedColumns.push(column);
                }
                break;
            default:
                // default is always show the column
                this.displayedColumns.push(column);
                break;
        }
    }
};

// should replace with utils method 'add all'
headerGroup.prototype.addToVisibleColumns = function(colsToAdd) {
    for (var i = 0; i < this.displayedColumns.length; i++) {
        var column = this.displayedColumns[i];
        colsToAdd.push(column);
    }
};

var colIdSequence = 0;

function Column(colDef, actualWidth, hide) {
    this.colDef = colDef;
    this.actualWidth = actualWidth;
    this.visible = !colDef.hide;
    // in the future, the colKey might be something other than the index
    if (colDef.colId) {
        this.colId = colDef.colId;
    }else if (colDef.field) {
        this.colId = colDef.field;
    } else {
        this.colId = '' + colIdSequence++;
    }
}

module.exports = ColumnController;

},{"./constants":4,"./utils":38}],4:[function(require,module,exports){
var constants = {
    STEP_EVERYTHING: 0,
    STEP_FILTER: 1,
    STEP_SORT: 2,
    STEP_MAP: 3,
    ASC: "asc",
    DESC: "desc",
    ROW_BUFFER_SIZE: 20,
    SORT_STYLE_SHOW: "display:inline;",
    SORT_STYLE_HIDE: "display:none;",
    MIN_COL_WIDTH: 10,

    KEY_TAB: 9,
    KEY_ENTER: 13,
    KEY_SPACE: 32,
    KEY_DOWN: 40,
    KEY_UP: 38,
    KEY_LEFT: 37,
    KEY_RIGHT: 39
};

// taken from http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
// Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
// At least Safari 3+: "[object HTMLElementConstructor]"
var isChrome = !!window.chrome && !this.isOpera; // Chrome 1+
var isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6

if (isOpera) {
    constants.BROWSER = 'opera';
} else if (isFirefox) {
    constants.BROWSER = 'firefox';
} else if (isSafari) {
    constants.BROWSER = 'safari';
} else if (isChrome) {
    constants.BROWSER = 'chrome';
} else if (isIE) {
    constants.BROWSER = 'ie';
}

var isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
var isWindows = navigator.platform.toUpperCase().indexOf('WIN')>=0;
if (isMac) {
    constants.PLATFORM = 'mac';
} else if (isWindows) {
    constants.PLATFORM = 'win';
}

module.exports = constants;

},{}],5:[function(require,module,exports){
var utils = require('../utils');

function DragAndDropService() {
    document.addEventListener('mouseup', this.stopDragging.bind(this));
}

DragAndDropService.prototype.stopDragging = function() {
    if (this.dragItem) {
        this.setDragCssClasses(this.dragItem.eDragSource, false);
        this.dragItem = null;
    }
};

DragAndDropService.prototype.setDragCssClasses = function(eListItem, dragging) {
    utils.addOrRemoveCssClass(eListItem, 'ag-dragging', dragging);
    utils.addOrRemoveCssClass(eListItem, 'ag-not-dragging', !dragging);
};

DragAndDropService.prototype.addDragSource = function(eDragSource, dragSourceCallback, containerId) {

    this.setDragCssClasses(eDragSource, false);

    var mouseDown = false;
    var that = this;

    eDragSource.addEventListener('mousedown', function() {
        mouseDown = true;
    });

    eDragSource.addEventListener('mouseup', function() {
        mouseDown = false;
    });

    eDragSource.addEventListener('mouseout', function() {
        mouseDown = false;
    });

    eDragSource.addEventListener('mousemove', function() {
        if (mouseDown) {
            var alreadyDraggingThisItem = this.dragItem && this.dragItem.eDropSource === eDragSource;
            if (!alreadyDraggingThisItem) {
                that.startDragging(eDragSource, dragSourceCallback, containerId);
            }
        }
    });
};

DragAndDropService.prototype.startDragging = function(eDragSource, dragSourceCallback) {
    if (this.dragItem && this.dragItem.eDragSource === eDragSource) {
        return;
    }
    if (this.dragItem) {
        this.stopDragging();
    }
    var data;
    if (dragSourceCallback.getData) {
        data = dragSourceCallback.getData();
    }
    var containerId;
    if (dragSourceCallback.getContainerId) {
        containerId = dragSourceCallback.getContainerId();
    }

    this.dragItem = {
        eDragSource: eDragSource,
        data: data,
        containerId: containerId
    };
    this.setDragCssClasses(this.dragItem.eDragSource, true);
};

DragAndDropService.prototype.addDropTarget = function(eDropTarget, dropTargetCallback) {
    var mouseIn = false;
    var acceptDrag = false;
    var that = this;

    eDropTarget.addEventListener('mouseover', function() {
        if (!mouseIn) {
            mouseIn = true;
            if (that.dragItem) {
                acceptDrag = dropTargetCallback.acceptDrag(that.dragItem);
            } else {
                acceptDrag = false;
            }
        }
    });

    eDropTarget.addEventListener('mouseout', function() {
        if (acceptDrag) {
            dropTargetCallback.noDrop();
        }
        mouseIn = false;
        acceptDrag = false;
    });

    eDropTarget.addEventListener('mouseup', function() {
        // dragItem should never be null, checking just in case
        if (acceptDrag && that.dragItem) {
            dropTargetCallback.drop(that.dragItem);
        }
    });

};

module.exports = new DragAndDropService();
},{"../utils":38}],6:[function(require,module,exports){
function ExpressionService() {}

ExpressionService.prototype.evaluate = function(rule, params) {
};

function ExpressionService() {
    this.expressionToFunctionCache = {};
}

ExpressionService.prototype.evaluate = function (expression, params) {

    try {
        var javaScriptFunction = this.createExpressionFunction(expression);
        var result = javaScriptFunction(params.value, params.context, params.node,
            params.data, params.colDef, params.rowIndex, params.api);
        return result;
    } catch (e) {
        // the expression failed, which can happen, as it's the client that
        // provides the expression. so print a nice message
        console.error('Processing of the expression failed');
        console.error('Expression = ' + expression);
        console.error('Exception = ' + e);
        return null;
    }
};

ExpressionService.prototype.createExpressionFunction = function (expression) {
    // check cache first
    if (this.expressionToFunctionCache[expression]) {
        return this.expressionToFunctionCache[expression];
    }
    // if not found in cache, return the function
    var functionBody = this.createFunctionBody(expression);
    var theFunction = new Function('x, ctx, node, data, colDef, rowIndex, api', functionBody);

    // store in cache
    this.expressionToFunctionCache[expression] = theFunction;

    return theFunction;
};

ExpressionService.prototype.createFunctionBody = function (expression) {
    // if the expression has the 'return' word in it, then use as is,
    // if not, then wrap it with return and ';' to make a function
    if (expression.indexOf('return') >= 0) {
        return expression;
    } else {
        return 'return ' + expression + ';';
    }
};

module.exports = ExpressionService;

},{}],7:[function(require,module,exports){
var utils = require('./../utils');
var SetFilter = require('./setFilter');
var NumberFilter = require('./numberFilter');
var StringFilter = require('./textFilter');

function FilterManager() {}

FilterManager.prototype.init = function(grid, gridOptionsWrapper, $compile, $scope, expressionService, columnModel) {
    this.$compile = $compile;
    this.$scope = $scope;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.grid = grid;
    this.allFilters = {};
    this.expressionService = expressionService;
    this.columnModel = columnModel;
};

FilterManager.prototype.setFilterModel = function(model) {
    var that = this;
    if (model) {
        // mark the filters as we set them, so any active filters left over we stop
        var processedFields = Object.keys(model);
        utils.iterateObject(this.allFilters, function(key, filterWrapper) {
            var field = filterWrapper.column.colDef.field;
            utils.removeFromArray(processedFields, field);
            if (field) {
                var newModel = model[field];
                that.setModelOnFilterWrapper(filterWrapper.filter, newModel);
            } else {
                console.warn('Warning ag-grid - no field found for column while doing setFilterModel');
            }
        });
        // at this point, processedFields contains data for which we don't have a filter working yet
        utils.iterateArray(processedFields, function(field) {
            var column = that.columnModel.getColumn(field);
            if (!column) {
                console.warn('Warning ag-grid - no column found for field ' + field);
                return;
            }
            var filterWrapper = that.getOrCreateFilterWrapper(column);
            that.setModelOnFilterWrapper(filterWrapper.filter, model[field]);
        });
    } else {
        utils.iterateObject(this.allFilters, function(key, filterWrapper) {
            that.setModelOnFilterWrapper(filterWrapper.filter, null);
        });
    }
};

FilterManager.prototype.setModelOnFilterWrapper = function(filter, newModel) {
    // because user can provide filters, we provide useful error checking and messages
    if (typeof filter.getApi !== 'function') {
        console.warn('Warning ag-grid - filter missing getApi method, which is needed for getFilterModel');
        return;
    }
    var filterApi = filter.getApi();
    if (typeof filterApi.setModel !== 'function') {
        console.warn('Warning ag-grid - filter API missing setModel method, which is needed for setFilterModel');
        return;
    }
    filterApi.setModel(newModel);
};

FilterManager.prototype.getFilterModel = function() {
    var result = {};
    utils.iterateObject(this.allFilters, function(key, filterWrapper) {
        // because user can provide filters, we provide useful error checking and messages
        if (typeof filterWrapper.filter.getApi !== 'function') {
            console.warn('Warning ag-grid - filter missing getApi method, which is needed for getFilterModel');
            return;
        }
        var filterApi = filterWrapper.filter.getApi();
        if (typeof filterApi.getModel !== 'function') {
            console.warn('Warning ag-grid - filter API missing getModel method, which is needed for getFilterModel');
            return;
        }
        var model = filterApi.getModel();
        if (model) {
            var field = filterWrapper.column.colDef.field;
            if (!field) {
                console.warn('Warning ag-grid - cannot get filter model when no field value present for column');
            } else {
                result[field] = model;
            }
        }
    });
    return result;
};

FilterManager.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

// returns true if at least one filter is active
FilterManager.prototype.isFilterPresent = function() {
    var atLeastOneActive = false;
    var that = this;

    var keys = Object.keys(this.allFilters);
    keys.forEach(function(key) {
        var filterWrapper = that.allFilters[key];
        if (!filterWrapper.filter.isFilterActive) { // because users can do custom filters, give nice error message
            console.error('Filter is missing method isFilterActive');
        }
        if (filterWrapper.filter.isFilterActive()) {
            atLeastOneActive = true;
        }
    });
    return atLeastOneActive;
};

// returns true if given col has a filter active
FilterManager.prototype.isFilterPresentForCol = function(colId) {
    var filterWrapper = this.allFilters[colId];
    if (!filterWrapper) {
        return false;
    }
    if (!filterWrapper.filter.isFilterActive) { // because users can do custom filters, give nice error message
        console.error('Filter is missing method isFilterActive');
    }
    var filterPresent = filterWrapper.filter.isFilterActive();
    return filterPresent;
};

FilterManager.prototype.doesFilterPass = function(node) {
    var data = node.data;
    var colKeys = Object.keys(this.allFilters);
    for (var i = 0, l = colKeys.length; i < l; i++) { // critical code, don't use functional programming

        var colId = colKeys[i];
        var filterWrapper = this.allFilters[colId];

        // if no filter, always pass
        if (filterWrapper === undefined) {
            continue;
        }

        if (!filterWrapper.filter.doesFilterPass) { // because users can do custom filters, give nice error message
            console.error('Filter is missing method doesFilterPass');
        }
        var params = {
            node: node,
            data: data
        };
        if (!filterWrapper.filter.doesFilterPass(params)) {
            return false;
        }
    }
    // all filters passed
    return true;
};

FilterManager.prototype.onNewRowsLoaded = function() {
    var that = this;
    Object.keys(this.allFilters).forEach(function(field) {
        var filter = that.allFilters[field].filter;
        if (filter.onNewRowsLoaded) {
            filter.onNewRowsLoaded();
        }
    });
};

FilterManager.prototype.positionPopup = function(eventSource, ePopup, ePopupRoot) {
    var sourceRect = eventSource.getBoundingClientRect();
    var parentRect = ePopupRoot.getBoundingClientRect();

    var x = sourceRect.left - parentRect.left;
    var y = sourceRect.top - parentRect.top + sourceRect.height;

    // if popup is overflowing to the right, move it left
    var widthOfPopup = 200; // this is set in the css
    var widthOfParent = parentRect.right - parentRect.left;
    var maxX = widthOfParent - widthOfPopup - 20; // 20 pixels grace
    if (x > maxX) { // move position left, back into view
        x = maxX;
    }
    if (x < 0) { // in case the popup has a negative value
        x = 0;
    }

    ePopup.style.left = x + "px";
    ePopup.style.top = y + "px";
};

FilterManager.prototype.createValueGetter = function(colDef) {
    var that = this;
    return function valueGetter(node) {
        var api = that.gridOptionsWrapper.getApi();
        var context = that.gridOptionsWrapper.getContext();
        return utils.getValue(that.expressionService, node.data, colDef, node, api, context);
    };
};

FilterManager.prototype.getFilterApi = function(column) {
    var filterWrapper = this.getOrCreateFilterWrapper(column);
    if (filterWrapper) {
        if (typeof filterWrapper.filter.getApi === 'function') {
            return filterWrapper.filter.getApi();
        }
    }
};

FilterManager.prototype.getOrCreateFilterWrapper = function(column) {
    var filterWrapper = this.allFilters[column.colId];

    if (!filterWrapper) {
        filterWrapper = this.createFilterWrapper(column);
        this.allFilters[column.colId] = filterWrapper;
    }

    return filterWrapper;
};

FilterManager.prototype.createFilterWrapper = function(column) {
    var colDef = column.colDef;

    var filterWrapper = {
        column: column
    };
    var filterChangedCallback = this.grid.onFilterChanged.bind(this.grid);
    var filterParams = colDef.filterParams;
    var params = {
        colDef: colDef,
        rowModel: this.rowModel,
        filterChangedCallback: filterChangedCallback,
        filterParams: filterParams,
        localeTextFunc: this.gridOptionsWrapper.getLocaleTextFunc(),
        valueGetter: this.createValueGetter(colDef)
    };
    if (typeof colDef.filter === 'function') {
        // if user provided a filter, just use it
        // first up, create child scope if needed
        if (this.gridOptionsWrapper.isAngularCompileFilters()) {
            var scope = this.$scope.$new();
            filterWrapper.scope = scope;
            params.$scope = scope;
        }
        // now create filter
        filterWrapper.filter = new colDef.filter(params);
    } else if (colDef.filter === 'text') {
        filterWrapper.filter = new StringFilter(params);
    } else if (colDef.filter === 'number') {
        filterWrapper.filter = new NumberFilter(params);
    } else {
        filterWrapper.filter = new SetFilter(params);
    }

    if (!filterWrapper.filter.getGui) { // because users can do custom filters, give nice error message
        throw 'Filter is missing method getGui';
    }

    var eFilterGui = document.createElement('div');
    eFilterGui.className = 'ag-filter';
    var guiFromFilter = filterWrapper.filter.getGui();
    if (utils.isNodeOrElement(guiFromFilter)) {
        //a dom node or element was returned, so add child
        eFilterGui.appendChild(guiFromFilter);
    } else {
        //otherwise assume it was html, so just insert
        var eTextSpan = document.createElement('span');
        eTextSpan.innerHTML = guiFromFilter;
        eFilterGui.appendChild(eTextSpan);
    }

    if (filterWrapper.scope) {
        filterWrapper.gui = this.$compile(eFilterGui)(filterWrapper.scope)[0];
    } else {
        filterWrapper.gui = eFilterGui;
    }

    return filterWrapper;
};

FilterManager.prototype.showFilter = function(column, eventSource) {

    var filterWrapper = this.getOrCreateFilterWrapper(column);

    var ePopupParent = this.grid.getPopupParent();
    this.positionPopup(eventSource, filterWrapper.gui, ePopupParent);

    utils.addAsModalPopup(ePopupParent, filterWrapper.gui);

    if (filterWrapper.filter.afterGuiAttached) {
        filterWrapper.filter.afterGuiAttached();
    }
};

module.exports = FilterManager;

},{"./../utils":38,"./numberFilter":9,"./setFilter":11,"./textFilter":14}],8:[function(require,module,exports){
module.exports = "<div><div><select class=ag-filter-select id=filterType><option value=1>[EQUALS]</option><option value=2>[LESS THAN]</option><option value=3>[GREATER THAN]</option></select></div><div><input class=ag-filter-filter id=filterText type=text placeholder=\"[FILTER...]\"></div></div>";

},{}],9:[function(require,module,exports){
var utils = require('./../utils');
var template = require('./numberFilter.html');

var EQUALS = 1;
var LESS_THAN = 2;
var GREATER_THAN = 3;

function NumberFilter(params) {
    this.filterParams = params.filterParams;
    this.filterChangedCallback = params.filterChangedCallback;
    this.localeTextFunc = params.localeTextFunc;
    this.valueGetter = params.valueGetter;
    this.createGui();
    this.filterNumber = null;
    this.filterType = EQUALS;
    this.createApi();
}

/* public */
NumberFilter.prototype.onNewRowsLoaded = function() {
    var keepSelection = this.filterParams && this.filterParams.newRowsAction === 'keep';
    if (!keepSelection) {
        this.api.setType(EQUALS);
        this.api.setFilter(null);
    }
};

/* public */
NumberFilter.prototype.afterGuiAttached = function() {
    this.eFilterTextField.focus();
};

/* public */
NumberFilter.prototype.doesFilterPass = function(node) {
    if (this.filterNumber === null) {
        return true;
    }
    var value = this.valueGetter(node);

    if (!value && value !== 0) {
        return false;
    }

    var valueAsNumber;
    if (typeof value === 'number') {
        valueAsNumber = value;
    } else {
        valueAsNumber = parseFloat(value);
    }

    switch (this.filterType) {
        case EQUALS:
            return valueAsNumber === this.filterNumber;
        case LESS_THAN:
            return valueAsNumber <= this.filterNumber;
        case GREATER_THAN:
            return valueAsNumber >= this.filterNumber;
        default:
            // should never happen
            console.warn('invalid filter type ' + this.filterType);
            return false;
    }
};

/* public */
NumberFilter.prototype.getGui = function() {
    return this.eGui;
};

/* public */
NumberFilter.prototype.isFilterActive = function() {
    return this.filterNumber !== null;
};

NumberFilter.prototype.createTemplate = function() {
    return template
        .replace('[FILTER...]', this.localeTextFunc('filterOoo', 'Filter...'))
        .replace('[EQUALS]', this.localeTextFunc('equals', 'Equals'))
        .replace('[LESS THAN]', this.localeTextFunc('lessThan', 'Less than'))
        .replace('[GREATER THAN]', this.localeTextFunc('greaterThan', 'Greater than'));
};

NumberFilter.prototype.createGui = function() {
    this.eGui = utils.loadTemplate(this.createTemplate());
    this.eFilterTextField = this.eGui.querySelector("#filterText");
    this.eTypeSelect = this.eGui.querySelector("#filterType");

    utils.addChangeListener(this.eFilterTextField, this.onFilterChanged.bind(this));
    this.eTypeSelect.addEventListener("change", this.onTypeChanged.bind(this));
};

NumberFilter.prototype.onTypeChanged = function() {
    this.filterType = parseInt(this.eTypeSelect.value);
    this.filterChangedCallback();
};

NumberFilter.prototype.onFilterChanged = function() {
    var filterText = utils.makeNull(this.eFilterTextField.value);
    if (filterText && filterText.trim() === '') {
        filterText = null;
    }
    if (filterText) {
        this.filterNumber = parseFloat(filterText);
    } else {
        this.filterNumber = null;
    }
    this.filterChangedCallback();
};

NumberFilter.prototype.createApi = function() {
    var that = this;
    this.api = {
        EQUALS: EQUALS,
        LESS_THAN: LESS_THAN,
        GREATER_THAN: GREATER_THAN,
        setType: function(type) {
            that.filterType = type;
            that.eTypeSelect.value = type;
        },
        setFilter: function(filter) {
            filter = utils.makeNull(filter);

            if (filter!==null && !(typeof filter === 'number')) {
                filter = parseFloat(filter);
            }
            that.filterNumber = filter;
            that.eFilterTextField.value = filter;
        },
        getType: function() {
            return that.filterType;
        },
        getFilter: function() {
            return that.filterNumber;
        },
        getModel: function() {
            if (that.isFilterActive()) {
                return {
                    type: that.filterType,
                    filter: that.filterNumber
                };
            } else {
                return null;
            }
        },
        setModel: function(dataModel) {
            if (dataModel) {
                this.setType(dataModel.type);
                this.setFilter(dataModel.filter);
            } else {
                this.setFilter(null);
            }
        }
    };
};

NumberFilter.prototype.getApi = function() {
    return this.api;
};

module.exports = NumberFilter;

},{"./../utils":38,"./numberFilter.html":8}],10:[function(require,module,exports){
module.exports = "<div><div class=ag-filter-header-container><input class=ag-filter-filter type=text placeholder=\"[SEARCH...]\"></div><div class=ag-filter-header-container><label><input id=selectAll type=checkbox class=\"ag-filter-checkbox\"> ([SELECT ALL])</label></div><div class=ag-filter-list-viewport><div class=ag-filter-list-container><div id=itemForRepeat class=ag-filter-item><label><input type=checkbox class=ag-filter-checkbox filter-checkbox=\"true\"> <span class=ag-filter-value></span></label></div></div></div></div>";

},{}],11:[function(require,module,exports){
var utils = require('./../utils');
var SetFilterModel = require('./setFilterModel');
var template = require('./setFilter.html');

var DEFAULT_ROW_HEIGHT = 20;

function SetFilter(params) {
    this.filterParams = params.filterParams;
    this.rowHeight = (this.filterParams && this.filterParams.cellHeight) ? this.filterParams.cellHeight : DEFAULT_ROW_HEIGHT;
    this.model = new SetFilterModel(params.colDef, params.rowModel, params.valueGetter);
    this.filterChangedCallback = params.filterChangedCallback;
    this.valueGetter = params.valueGetter;
    this.rowsInBodyContainer = {};
    this.colDef = params.colDef;
    this.localeTextFunc = params.localeTextFunc;
    if (this.filterParams) {
        this.cellRenderer = this.filterParams.cellRenderer;
    }
    this.createGui();
    this.addScrollListener();
    this.createApi();
}

// we need to have the gui attached before we can draw the virtual rows, as the
// virtual row logic needs info about the gui state
/* public */
SetFilter.prototype.afterGuiAttached = function() {
    this.drawVirtualRows();
};

/* public */
SetFilter.prototype.isFilterActive = function() {
    return this.model.isFilterActive();
};

/* public */
SetFilter.prototype.doesFilterPass = function(node) {

    //if no filter, always pass
    if (this.model.isEverythingSelected()) {
        return true;
    }
    //if nothing selected in filter, always fail
    if (this.model.isNothingSelected()) {
        return false;
    }

    var value = this.valueGetter(node);
    value = utils.makeNull(value);

    var filterPassed = this.model.isValueSelected(value);
    return filterPassed;
};

/* public */
SetFilter.prototype.getGui = function() {
    return this.eGui;
};

/* public */
SetFilter.prototype.onNewRowsLoaded = function() {
    var keepSelection = this.filterParams && this.filterParams.newRowsAction === 'keep';
    // default is reset
    this.model.refreshUniqueValues(keepSelection);
    this.setContainerHeight();
    this.refreshVirtualRows();
};

SetFilter.prototype.createTemplate = function() {
    return template
        .replace('[SELECT ALL]', this.localeTextFunc('selectAll', 'Select All'))
        .replace('[SEARCH...]', this.localeTextFunc('searchOoo', 'Search...'));
};

SetFilter.prototype.createGui = function() {
    var _this = this;

    this.eGui = utils.loadTemplate(this.createTemplate());

    this.eListContainer = this.eGui.querySelector(".ag-filter-list-container");
    this.eFilterValueTemplate = this.eGui.querySelector("#itemForRepeat");
    this.eSelectAll = this.eGui.querySelector("#selectAll");
    this.eListViewport = this.eGui.querySelector(".ag-filter-list-viewport");
    this.eMiniFilter = this.eGui.querySelector(".ag-filter-filter");
    this.eListContainer.style.height = (this.model.getUniqueValueCount() * this.rowHeight) + "px";

    this.setContainerHeight();
    this.eMiniFilter.value = this.model.getMiniFilter();
    utils.addChangeListener(this.eMiniFilter, function() {
        _this.onMiniFilterChanged();
    });
    utils.removeAllChildren(this.eListContainer);

    this.eSelectAll.onclick = this.onSelectAll.bind(this);

    if (this.model.isEverythingSelected()) {
        this.eSelectAll.indeterminate = false;
        this.eSelectAll.checked = true;
    } else if (this.model.isNothingSelected()) {
        this.eSelectAll.indeterminate = false;
        this.eSelectAll.checked = false;
    } else {
        this.eSelectAll.indeterminate = true;
    }
};

SetFilter.prototype.setContainerHeight = function() {
    this.eListContainer.style.height = (this.model.getDisplayedValueCount() * this.rowHeight) + "px";
};

SetFilter.prototype.drawVirtualRows = function() {
    var topPixel = this.eListViewport.scrollTop;
    var bottomPixel = topPixel + this.eListViewport.offsetHeight;

    var firstRow = Math.floor(topPixel / this.rowHeight);
    var lastRow = Math.floor(bottomPixel / this.rowHeight);

    this.ensureRowsRendered(firstRow, lastRow);
};

SetFilter.prototype.ensureRowsRendered = function(start, finish) {
    var _this = this;

    //at the end, this array will contain the items we need to remove
    var rowsToRemove = Object.keys(this.rowsInBodyContainer);

    //add in new rows
    for (var rowIndex = start; rowIndex <= finish; rowIndex++) {
        //see if item already there, and if yes, take it out of the 'to remove' array
        if (rowsToRemove.indexOf(rowIndex.toString()) >= 0) {
            rowsToRemove.splice(rowsToRemove.indexOf(rowIndex.toString()), 1);
            continue;
        }
        //check this row actually exists (in case overflow buffer window exceeds real data)
        if (this.model.getDisplayedValueCount() > rowIndex) {
            var value = this.model.getDisplayedValue(rowIndex);
            _this.insertRow(value, rowIndex);
        }
    }

    //at this point, everything in our 'rowsToRemove' . . .
    this.removeVirtualRows(rowsToRemove);
};

//takes array of row id's
SetFilter.prototype.removeVirtualRows = function(rowsToRemove) {
    var _this = this;
    rowsToRemove.forEach(function(indexToRemove) {
        var eRowToRemove = _this.rowsInBodyContainer[indexToRemove];
        _this.eListContainer.removeChild(eRowToRemove);
        delete _this.rowsInBodyContainer[indexToRemove];
    });
};

SetFilter.prototype.insertRow = function(value, rowIndex) {
    var _this = this;

    var eFilterValue = this.eFilterValueTemplate.cloneNode(true);

    var valueElement = eFilterValue.querySelector(".ag-filter-value");
    if (this.cellRenderer) {
        //renderer provided, so use it
        var resultFromRenderer = this.cellRenderer({
            value: value
        });

        if (utils.isNode(resultFromRenderer)) {
            //a dom node or element was returned, so add child
            valueElement.appendChild(resultFromRenderer);
        } else {
            //otherwise assume it was html, so just insert
            valueElement.innerHTML = resultFromRenderer;
        }

    } else {
        //otherwise display as a string
        var blanksText = '(' + this.localeTextFunc('blanks', 'Blanks') + ')';
        var displayNameOfValue = value === null ? blanksText : value;
        valueElement.innerHTML = displayNameOfValue;
    }
    var eCheckbox = eFilterValue.querySelector("input");
    eCheckbox.checked = this.model.isValueSelected(value);

    eCheckbox.onclick = function() {
        _this.onCheckboxClicked(eCheckbox, value);
    };

    eFilterValue.style.top = (this.rowHeight * rowIndex) + "px";

    this.eListContainer.appendChild(eFilterValue);
    this.rowsInBodyContainer[rowIndex] = eFilterValue;
};

SetFilter.prototype.onCheckboxClicked = function(eCheckbox, value) {
    var checked = eCheckbox.checked;
    if (checked) {
        this.model.selectValue(value);
        if (this.model.isEverythingSelected()) {
            this.eSelectAll.indeterminate = false;
            this.eSelectAll.checked = true;
        } else {
            this.eSelectAll.indeterminate = true;
        }
    } else {
        this.model.unselectValue(value);
        //if set is empty, nothing is selected
        if (this.model.isNothingSelected()) {
            this.eSelectAll.indeterminate = false;
            this.eSelectAll.checked = false;
        } else {
            this.eSelectAll.indeterminate = true;
        }
    }

    this.filterChangedCallback();
};

SetFilter.prototype.onMiniFilterChanged = function() {
    var miniFilterChanged = this.model.setMiniFilter(this.eMiniFilter.value);
    if (miniFilterChanged) {
        this.setContainerHeight();
        this.refreshVirtualRows();
    }
};

SetFilter.prototype.refreshVirtualRows = function() {
    this.clearVirtualRows();
    this.drawVirtualRows();
};

SetFilter.prototype.clearVirtualRows = function() {
    var rowsToRemove = Object.keys(this.rowsInBodyContainer);
    this.removeVirtualRows(rowsToRemove);
};

SetFilter.prototype.onSelectAll = function() {
    var checked = this.eSelectAll.checked;
    if (checked) {
        this.model.selectEverything();
    } else {
        this.model.selectNothing();
    }
    this.updateAllCheckboxes(checked);
    this.filterChangedCallback();
};

SetFilter.prototype.updateAllCheckboxes = function(checked) {
    var currentlyDisplayedCheckboxes = this.eListContainer.querySelectorAll("[filter-checkbox=true]");
    for (var i = 0, l = currentlyDisplayedCheckboxes.length; i < l; i++) {
        currentlyDisplayedCheckboxes[i].checked = checked;
    }
};

SetFilter.prototype.addScrollListener = function() {
    var _this = this;

    this.eListViewport.addEventListener("scroll", function() {
        _this.drawVirtualRows();
    });
};

SetFilter.prototype.getApi = function() {
    return this.api;
};

SetFilter.prototype.createApi = function() {
    var model = this.model;
    var that = this;
    this.api = {
        setMiniFilter: function(newMiniFilter) {
            model.setMiniFilter(newMiniFilter);
        },
        getMiniFilter: function() {
            return model.getMiniFilter();
        },
        selectEverything: function() {
            model.selectEverything();
        },
        isFilterActive: function() {
            return model.isFilterActive();
        },
        selectNothing: function() {
            model.selectNothing();
        },
        unselectValue: function(value) {
            model.unselectValue(value);
            that.refreshVirtualRows();
        },
        selectValue: function(value) {
            model.selectValue(value);
            that.refreshVirtualRows();
        },
        isValueSelected: function(value) {
            return model.isValueSelected(value);
        },
        isEverythingSelected: function() {
            return model.isEverythingSelected();
        },
        isNothingSelected: function() {
            return model.isNothingSelected();
        },
        getUniqueValueCount: function() {
            return model.getUniqueValueCount();
        },
        getUniqueValue: function(index) {
            return model.getUniqueValue(index);
        },
        getModel: function() {
            return model.getModel();
        },
        setModel: function(dataModel) {
            model.setModel(dataModel);
            that.refreshVirtualRows();
        }
    };
};

module.exports = SetFilter;

},{"./../utils":38,"./setFilter.html":10,"./setFilterModel":12}],12:[function(require,module,exports){
var utils = require('../utils');

function SetFilterModel(colDef, rowModel, valueGetter) {
    this.colDef = colDef;
    this.rowModel = rowModel;
    this.valueGetter = valueGetter;

    this.createUniqueValues();

    // by default, no filter, so we display everything
    this.displayedValues = this.uniqueValues;
    this.miniFilter = null;
    //we use a map rather than an array for the selected values as the lookup
    //for a map is much faster than the lookup for an array, especially when
    //the length of the array is thousands of records long
    this.selectedValuesMap = {};
    this.selectEverything();
}

SetFilterModel.prototype.refreshUniqueValues = function(keepSelection) {
    this.createUniqueValues();

    var oldModel = Object.keys(this.selectedValuesMap);

    this.selectedValuesMap = {};
    this.filterDisplayedValues();

    if (keepSelection) {
        this.setModel(oldModel);
    } else {
        this.selectEverything();
    }
};

SetFilterModel.prototype.createUniqueValues = function() {
    if (this.colDef.filterParams && this.colDef.filterParams.values) {
        this.uniqueValues = utils.toStrings(this.colDef.filterParams.values);
    } else {
        this.uniqueValues = utils.toStrings(this.iterateThroughNodesForValues());
    }

    if (this.colDef.comparator) {
        this.uniqueValues.sort(this.colDef.comparator);
    } else {
        this.uniqueValues.sort(utils.defaultComparator);
    }
};

SetFilterModel.prototype.iterateThroughNodesForValues = function() {
    var uniqueCheck = {};
    var result = [];

    var that = this;

    function recursivelyProcess(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.group && !node.footer) {
                // group node, so dig deeper
                recursivelyProcess(node.children);
            } else {
                var value = that.valueGetter(node);
                if (value === "" || value === undefined) {
                    value = null;
                }
                if (!uniqueCheck.hasOwnProperty(value)) {
                    result.push(value);
                    uniqueCheck[value] = 1;
                }
            }
        }
    }

    var topLevelNodes = this.rowModel.getTopLevelNodes();
    recursivelyProcess(topLevelNodes);

    return result;
};

//sets mini filter. returns true if it changed from last value, otherwise false
SetFilterModel.prototype.setMiniFilter = function(newMiniFilter) {
    newMiniFilter = utils.makeNull(newMiniFilter);
    if (this.miniFilter === newMiniFilter) {
        //do nothing if filter has not changed
        return false;
    }
    this.miniFilter = newMiniFilter;
    this.filterDisplayedValues();
    return true;
};

SetFilterModel.prototype.getMiniFilter = function() {
    return this.miniFilter;
};

SetFilterModel.prototype.filterDisplayedValues = function() {
    // if no filter, just use the unique values
    if (this.miniFilter === null) {
        this.displayedValues = this.uniqueValues;
        return;
    }

    // if filter present, we filter down the list
    this.displayedValues = [];
    var miniFilterUpperCase = this.miniFilter.toUpperCase();
    for (var i = 0, l = this.uniqueValues.length; i < l; i++) {
        var uniqueValue = this.uniqueValues[i];
        if (uniqueValue !== null && uniqueValue.toString().toUpperCase().indexOf(miniFilterUpperCase) >= 0) {
            this.displayedValues.push(uniqueValue);
        }
    }

};

SetFilterModel.prototype.getDisplayedValueCount = function() {
    return this.displayedValues.length;
};

SetFilterModel.prototype.getDisplayedValue = function(index) {
    return this.displayedValues[index];
};

SetFilterModel.prototype.selectEverything = function() {
    var count = this.uniqueValues.length;
    for (var i = 0; i < count; i++) {
        var value = this.uniqueValues[i];
        this.selectedValuesMap[value] = null;
    }
    this.selectedValuesCount = count;
};

SetFilterModel.prototype.isFilterActive = function() {
    return this.uniqueValues.length !== this.selectedValuesCount;
};

SetFilterModel.prototype.selectNothing = function() {
    this.selectedValuesMap = {};
    this.selectedValuesCount = 0;
};

SetFilterModel.prototype.getUniqueValueCount = function() {
    return this.uniqueValues.length;
};

SetFilterModel.prototype.getUniqueValue = function(index) {
    return this.uniqueValues[index];
};

SetFilterModel.prototype.unselectValue = function(value) {
    if (this.selectedValuesMap[value] !== undefined) {
        delete this.selectedValuesMap[value];
        this.selectedValuesCount--;
    }
};

SetFilterModel.prototype.selectValue = function(value) {
    if (this.selectedValuesMap[value] === undefined) {
        this.selectedValuesMap[value] = null;
        this.selectedValuesCount++;
    }
};

SetFilterModel.prototype.isValueSelected = function(value) {
    return this.selectedValuesMap[value] !== undefined;
};

SetFilterModel.prototype.isEverythingSelected = function() {
    return this.uniqueValues.length === this.selectedValuesCount;
};

SetFilterModel.prototype.isNothingSelected = function() {
    return this.uniqueValues.length === 0;
};

SetFilterModel.prototype.getModel = function() {
    if (!this.isFilterActive()) {
        return null;
    }
    var selectedValues = [];
    utils.iterateObject(this.selectedValuesMap, function(key) {
        selectedValues.push(key);
    });
    return selectedValues;
};

SetFilterModel.prototype.setModel = function(model) {
    if (model) {
        this.selectNothing();
        for (var i = 0; i<model.length; i++) {
            var newValue = model[i];
            if (this.uniqueValues.indexOf(newValue)>=0) {
                this.selectValue(model[i]);
            } else {
                console.warn('Value ' + newValue + ' is not a valid value for filter');
            }
        }
    } else {
        this.selectEverything();
    }
};

module.exports = SetFilterModel;

},{"../utils":38}],13:[function(require,module,exports){
module.exports = "<div><div><select class=ag-filter-select id=filterType><option value=1>[CONTAINS]</option><option value=2>[EQUALS]</option><option value=3>[STARTS WITH]</option><option value=4>[ENDS WITH]</option></select></div><div><input class=ag-filter-filter id=filterText type=text placeholder=\"[FILTER...]\"></div></div>";

},{}],14:[function(require,module,exports){
var utils = require('../utils');
var template = require('./textFilter.html');

var CONTAINS = 1;
var EQUALS = 2;
var STARTS_WITH = 3;
var ENDS_WITH = 4;

function TextFilter(params) {
    this.filterParams = params.filterParams;
    this.filterChangedCallback = params.filterChangedCallback;
    this.localeTextFunc = params.localeTextFunc;
    this.valueGetter = params.valueGetter;
    this.createGui();
    this.filterText = null;
    this.filterType = CONTAINS;
    this.createApi();
}

/* public */
TextFilter.prototype.onNewRowsLoaded = function() {
    var keepSelection = this.filterParams && this.filterParams.newRowsAction === 'keep';
    if (!keepSelection) {
        this.api.setType(CONTAINS);
        this.api.setFilter(null);
    }
};

/* public */
TextFilter.prototype.afterGuiAttached = function() {
    this.eFilterTextField.focus();
};

/* public */
TextFilter.prototype.doesFilterPass = function(node) {
    if (!this.filterText) {
        return true;
    }
    var value = this.valueGetter(node);
    if (!value) {
        return false;
    }
    var valueLowerCase = value.toString().toLowerCase();
    switch (this.filterType) {
        case CONTAINS:
            return valueLowerCase.indexOf(this.filterText) >= 0;
        case EQUALS:
            return valueLowerCase === this.filterText;
        case STARTS_WITH:
            return valueLowerCase.indexOf(this.filterText) === 0;
        case ENDS_WITH:
            var index = valueLowerCase.indexOf(this.filterText);
            return index >= 0 && index === (valueLowerCase.length - this.filterText.length);
        default:
            // should never happen
            console.warn('invalid filter type ' + this.filterType);
            return false;
    }
};

/* public */
TextFilter.prototype.getGui = function() {
    return this.eGui;
};

/* public */
TextFilter.prototype.isFilterActive = function() {
    return this.filterText !== null;
};

TextFilter.prototype.createTemplate = function() {
    return template
        .replace('[FILTER...]', this.localeTextFunc('filterOoo', 'Filter...'))
        .replace('[EQUALS]', this.localeTextFunc('equals', 'Equals'))
        .replace('[CONTAINS]', this.localeTextFunc('contains', 'Contains'))
        .replace('[STARTS WITH]', this.localeTextFunc('startsWith', 'Starts with'))
        .replace('[ENDS WITH]', this.localeTextFunc('endsWith', 'Ends with'))
;
};

'<option value="1">Contains</option>',
    '<option value="2">Equals</option>',
    '<option value="3">Starts with</option>',
    '<option value="4">Ends with</option>',


TextFilter.prototype.createGui = function() {
    this.eGui = utils.loadTemplate(this.createTemplate());
    this.eFilterTextField = this.eGui.querySelector("#filterText");
    this.eTypeSelect = this.eGui.querySelector("#filterType");

    utils.addChangeListener(this.eFilterTextField, this.onFilterChanged.bind(this));
    this.eTypeSelect.addEventListener("change", this.onTypeChanged.bind(this));
};

TextFilter.prototype.onTypeChanged = function() {
    this.filterType = parseInt(this.eTypeSelect.value);
    this.filterChangedCallback();
};

TextFilter.prototype.onFilterChanged = function() {
    var filterText = utils.makeNull(this.eFilterTextField.value);
    if (filterText && filterText.trim() === '') {
        filterText = null;
    }
    if (filterText) {
        this.filterText = filterText.toLowerCase();
    } else {
        this.filterText = null;
    }
    this.filterChangedCallback();
};

TextFilter.prototype.createApi = function() {
    var that = this;
    this.api = {
        EQUALS: EQUALS,
        CONTAINS: CONTAINS,
        STARTS_WITH: STARTS_WITH,
        ENDS_WITH: ENDS_WITH,
        setType: function(type) {
            that.filterType = type;
            that.eTypeSelect.value = type;
        },
        setFilter: function(filter) {
            filter = utils.makeNull(filter);

            if (filter) {
                that.filterText = filter.toLowerCase();
                that.eFilterTextField.value = filter;
            } else {
                that.filterText = null;
                that.eFilterTextField.value = null;
            }
        },
        getType: function() {
            return that.filterType;
        },
        getFilter: function() {
            return that.filterText;
        },
        getModel: function() {
            if (that.isFilterActive()) {
                return {
                    type: that.filterType,
                    filter: that.filterText
                };
            } else {
                return null;
            }
        },
        setModel: function(dataModel) {
            if (dataModel) {
                this.setType(dataModel.type);
                this.setFilter(dataModel.filter);
            } else {
                this.setFilter(null);
            }
        }
    };
};

TextFilter.prototype.getApi = function() {
    return this.api;
};

module.exports = TextFilter;

},{"../utils":38,"./textFilter.html":13}],15:[function(require,module,exports){
var utils = require('./utils');
var constants = require('./constants');
var GridOptionsWrapper = require('./gridOptionsWrapper');
var SelectionController = require('./selectionController');
var FilterManager = require('./filter/filterManager');
var SelectionRendererFactory = require('./selectionRendererFactory');
var ColumnController = require('./columnController');
var RowRenderer = require('./rowRenderer');
var HeaderRenderer = require('./headerRenderer');
var InMemoryRowController = require('./rowControllers/inMemoryRowController');
var VirtualPageRowController = require('./rowControllers/virtualPageRowController');
var PaginationController = require('./rowControllers/paginationController');
var ExpressionService = require('./expressionService');
var TemplateService = require('./templateService');
var ToolPanel = require('./toolPanel/toolPanel');
var BorderLayout = require('./layout/borderLayout');
var GridPanel = require('./gridPanel/gridPanel');

function Grid(eGridDiv, gridOptions, $scope, $compile, quickFilterOnScope) {

    this.gridOptions = gridOptions;
    this.gridOptionsWrapper = new GridOptionsWrapper(this.gridOptions);

    this.setupComponents($scope, $compile, eGridDiv);

    var that = this;
    this.quickFilter = null;

    // if using angular, watch for quickFilter changes
    if ($scope) {
        $scope.$watch(quickFilterOnScope, function(newFilter) {
            that.onQuickFilterChanged(newFilter);
        });
    }

    this.virtualRowCallbacks = {};

    var forPrint = this.gridOptionsWrapper.isDontUseScrolls();
    this.addApi();

    this.scrollWidth = utils.getScrollbarWidth();

    // done when cols change
    this.setupColumns();

    this.inMemoryRowController.setAllRows(this.gridOptionsWrapper.getAllRows());

    if (!forPrint) {
        window.addEventListener('resize', this.doLayout.bind(this));
    }

    this.updateModelAndRefresh(constants.STEP_EVERYTHING);

    // if no data provided initially, and not doing infinite scrolling, show the loading panel
    var showLoading = !this.gridOptionsWrapper.getAllRows() && !this.gridOptionsWrapper.isVirtualPaging();
    this.showLoadingPanel(showLoading);

    // if datasource provided, use it
    if (this.gridOptionsWrapper.getDatasource()) {
        this.setDatasource();
    }

    this.doLayout();

    this.finished = false;
    this.periodicallyDoLayout();

    // if ready function provided, use it
    if (typeof this.gridOptionsWrapper.getReady() == 'function') {
        this.gridOptionsWrapper.getReady()(gridOptions.api);
    }
}

Grid.prototype.periodicallyDoLayout = function() {
    if (!this.finished) {
        var that = this;
        setTimeout(function() {
            that.doLayout();
            that.periodicallyDoLayout();
        }, 500);
    }
};

Grid.prototype.setupComponents = function($scope, $compile, eUserProvidedDiv) {

    // make local references, to make the below more human readable
    var gridOptionsWrapper = this.gridOptionsWrapper;
    var gridOptions = this.gridOptions;
    var forPrint = gridOptionsWrapper.isDontUseScrolls();

    // create all the beans
    var selectionController = new SelectionController();
    var filterManager = new FilterManager();
    var selectionRendererFactory = new SelectionRendererFactory();
    var columnController = new ColumnController();
    var rowRenderer = new RowRenderer();
    var headerRenderer = new HeaderRenderer();
    var inMemoryRowController = new InMemoryRowController();
    var virtualPageRowController = new VirtualPageRowController();
    var expressionService = new ExpressionService();
    var templateService = new TemplateService();
    var gridPanel = new GridPanel(gridOptionsWrapper);

    var columnModel = columnController.getModel();

    // initialise all the beans
    templateService.init($scope);
    selectionController.init(this, gridPanel, gridOptionsWrapper, $scope, rowRenderer);
    filterManager.init(this, gridOptionsWrapper, $compile, $scope, expressionService, columnModel);
    selectionRendererFactory.init(this, selectionController);
    columnController.init(this, selectionRendererFactory, gridOptionsWrapper, expressionService);
    rowRenderer.init(gridOptions, columnModel, gridOptionsWrapper, gridPanel, this,
        selectionRendererFactory, $compile, $scope, selectionController, expressionService, templateService);
    headerRenderer.init(gridOptionsWrapper, columnController, columnModel, gridPanel, this, filterManager,
        $scope, $compile, expressionService);
    inMemoryRowController.init(gridOptionsWrapper, columnModel, this, filterManager, $scope, expressionService);
    virtualPageRowController.init(rowRenderer, gridOptionsWrapper, this);
    gridPanel.init(columnModel, rowRenderer);

    var toolPanelLayout = null;
    var eToolPanel = null;
    if (!forPrint) {
        eToolPanel = new ToolPanel();
        toolPanelLayout = eToolPanel.layout;
        eToolPanel.init(columnController, inMemoryRowController, gridOptionsWrapper);
    }

    // this is a child bean, get a reference and pass it on
    // CAN WE DELETE THIS? it's done in the setDatasource section
    var rowModel = inMemoryRowController.getModel();
    selectionController.setRowModel(rowModel);
    filterManager.setRowModel(rowModel);
    rowRenderer.setRowModel(rowModel);
    gridPanel.setRowModel(rowModel);

    // and the last bean, done in it's own section, as it's optional
    var paginationController = null;
    var paginationGui = null;
    if (!forPrint) {
        paginationController = new PaginationController();
        paginationController.init(this, gridOptionsWrapper);
        paginationGui = paginationController.getGui();
    }

    this.rowModel = rowModel;
    this.selectionController = selectionController;
    this.columnController = columnController;
    this.columnModel = columnModel;
    this.inMemoryRowController = inMemoryRowController;
    this.virtualPageRowController = virtualPageRowController;
    this.rowRenderer = rowRenderer;
    this.headerRenderer = headerRenderer;
    this.paginationController = paginationController;
    this.filterManager = filterManager;
    this.eToolPanel = eToolPanel;
    this.gridPanel = gridPanel;

    this.eRootPanel = new BorderLayout({
        center: gridPanel.layout,
        east: toolPanelLayout,
        south: paginationGui,
        dontFill: forPrint,
        name: 'eRootPanel'
    });

    // default is we don't show paging panel, this is set to true when datasource is set
    this.eRootPanel.setSouthVisible(false);

    // see what the grid options are for default of toolbar
    this.showToolPanel(gridOptionsWrapper.isShowToolPanel());

    eUserProvidedDiv.appendChild(this.eRootPanel.getGui());
};

Grid.prototype.showToolPanel = function(show) {
    if (!this.eToolPanel) {
        this.toolPanelShowing = false;
        return;
    }

    this.toolPanelShowing = show;
    this.eRootPanel.setEastVisible(show);
};

Grid.prototype.isToolPanelShowing = function() {
    return this.toolPanelShowing;
};

Grid.prototype.setDatasource = function(datasource) {
    // if datasource provided, then set it
    if (datasource) {
        this.gridOptions.datasource = datasource;
    }
    // get the set datasource (if null was passed to this method,
    // then need to get the actual datasource from options
    var datasourceToUse = this.gridOptionsWrapper.getDatasource();
    this.doingVirtualPaging = this.gridOptionsWrapper.isVirtualPaging() && datasourceToUse;
    this.doingPagination = datasourceToUse && !this.doingVirtualPaging;
    var showPagingPanel;

    if (this.doingVirtualPaging) {
        this.paginationController.setDatasource(null);
        this.virtualPageRowController.setDatasource(datasourceToUse);
        this.rowModel = this.virtualPageRowController.getModel();
        showPagingPanel = false;
    } else if (this.doingPagination) {
        this.paginationController.setDatasource(datasourceToUse);
        this.virtualPageRowController.setDatasource(null);
        this.rowModel = this.inMemoryRowController.getModel();
        showPagingPanel = true;
    } else {
        this.paginationController.setDatasource(null);
        this.virtualPageRowController.setDatasource(null);
        this.rowModel = this.inMemoryRowController.getModel();
        showPagingPanel = false;
    }

    this.selectionController.setRowModel(this.rowModel);
    this.filterManager.setRowModel(this.rowModel);
    this.rowRenderer.setRowModel(this.rowModel);

    this.eRootPanel.setSouthVisible(showPagingPanel);

    // because we just set the rowModel, need to update the gui
    this.rowRenderer.refreshView();

    this.doLayout();
};

// gets called after columns are shown / hidden from groups expanding
Grid.prototype.refreshHeaderAndBody = function() {
    this.headerRenderer.refreshHeader();
    this.headerRenderer.updateFilterIcons();
    this.headerRenderer.updateSortIcons();
    this.gridPanel.setBodyContainerWidth();
    this.gridPanel.setPinnedColContainerWidth();
    this.rowRenderer.refreshView();
};

Grid.prototype.setFinished = function() {
    window.removeEventListener('resize', this.doLayout);
    this.finished = true;
};

Grid.prototype.getPopupParent = function() {
    return this.eRootPanel.getGui();
};

Grid.prototype.getQuickFilter = function() {
    return this.quickFilter;
};

Grid.prototype.onQuickFilterChanged = function(newFilter) {
    if (newFilter === undefined || newFilter === "") {
        newFilter = null;
    }
    if (this.quickFilter !== newFilter) {
        if (this.gridOptionsWrapper.isVirtualPaging()) {
            console.warn('ag-grid: cannot do quick filtering when doing virtual paging');
            return;
        }

        //want 'null' to mean to filter, so remove undefined and empty string
        if (newFilter === undefined || newFilter === "") {
            newFilter = null;
        }
        if (newFilter !== null) {
            newFilter = newFilter.toUpperCase();
        }
        this.quickFilter = newFilter;
        this.onFilterChanged();
    }
};

Grid.prototype.onFilterChanged = function() {
    this.headerRenderer.updateFilterIcons();
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        // if doing server side filtering, changing the sort has the impact
        // of resetting the datasource
        this.setDatasource();
    } else {
        // if doing in memory filtering, we just update the in memory data
        this.updateModelAndRefresh(constants.STEP_FILTER);
    }
};

Grid.prototype.onRowClicked = function(event, rowIndex, node) {

    if (this.gridOptions.rowClicked) {
        var params = {
            node: node,
            data: node.data,
            event: event,
            rowIndex: rowIndex
        };
        this.gridOptions.rowClicked(params);
    }

    // we do not allow selecting groups by clicking (as the click here expands the group)
    // so return if it's a group row
    if (node.group) {
        return;
    }

    // making local variables to make the below more readable
    var gridOptionsWrapper = this.gridOptionsWrapper;
    var selectionController = this.selectionController;

    // if no selection method enabled, do nothing
    if (!gridOptionsWrapper.isRowSelection()) {
        return;
    }

    // if click selection suppressed, do nothing
    if (gridOptionsWrapper.isSuppressRowClickSelection()) {
        return;
    }

    // ctrlKey for windows, metaKey for Apple
    var ctrlKeyPressed = event.ctrlKey || event.metaKey;

    var doDeselect = ctrlKeyPressed
        && selectionController.isNodeSelected(node)
        && gridOptionsWrapper.isRowDeselection() ;

    if (doDeselect) {
        selectionController.deselectNode(node);
    } else {
        var tryMulti = ctrlKeyPressed;
        selectionController.selectNode(node, tryMulti);
    }
};

Grid.prototype.showLoadingPanel = function(show) {
    this.gridPanel.showLoading(show);
};

Grid.prototype.setupColumns = function() {
    this.gridPanel.setHeaderHeight();
    this.columnController.setColumns(this.gridOptionsWrapper.getColumnDefs());
    this.gridPanel.showPinnedColContainersIfNeeded();
    this.headerRenderer.refreshHeader();
    if (!this.gridOptionsWrapper.isDontUseScrolls()) {
        this.gridPanel.setPinnedColContainerWidth();
        this.gridPanel.setBodyContainerWidth();
    }
    this.headerRenderer.updateFilterIcons();
};

// rowsToRefresh is at what index to start refreshing the rows. the assumption is
// if we are expanding or collapsing a group, then only he rows below the group
// need to be refresh. this allows the context (eg focus) of the other cells to
// remain.
Grid.prototype.updateModelAndRefresh = function(step, refreshFromIndex) {
    this.inMemoryRowController.updateModel(step);
    this.rowRenderer.refreshView(refreshFromIndex);
};

Grid.prototype.setRows = function(rows, firstId) {
    if (rows) {
        this.gridOptions.rowData = rows;
    }
    this.inMemoryRowController.setAllRows(this.gridOptionsWrapper.getAllRows(), firstId);
    this.selectionController.deselectAll();
    this.filterManager.onNewRowsLoaded();
    this.updateModelAndRefresh(constants.STEP_EVERYTHING);
    this.headerRenderer.updateFilterIcons();
    this.showLoadingPanel(false);
};

Grid.prototype.ensureNodeVisible = function(comparator) {
    if (this.doingVirtualPaging) {
        throw 'Cannot use ensureNodeVisible when doing virtual paging, as we cannot check rows that are not in memory';
    }
    // look for the node index we want to display
    var rowCount = this.rowModel.getVirtualRowCount();
    var comparatorIsAFunction = typeof comparator === 'function';
    var indexToSelect = -1;
    // go through all the nodes, find the one we want to show
    for (var i = 0; i < rowCount; i++) {
        var node = this.rowModel.getVirtualRow(i);
        if (comparatorIsAFunction) {
            if (comparator(node)) {
                indexToSelect = i;
                break;
            }
        } else {
            // check object equality against node and data
            if (comparator === node || comparator === node.data) {
                indexToSelect = i;
                break;
            }
        }
    }
    if (indexToSelect >= 0) {
        this.gridPanel.ensureIndexVisible(indexToSelect);
    }
};

Grid.prototype.getFilterModel = function() {
    return this.filterManager.getFilterModel();
};

Grid.prototype.addApi = function() {
    var that = this;
    var api = {
        // HB Extension
        getColumnController: function() {
            return that.columnController;
        },
        // HB Extension
        getRowRenderer: function() {
            return that.rowRenderer;
        },
        // HB Extension
        scrollToColumnIndex: function(colIndex) {
            var columnModel = that.columnController.getModel();
            var offset = columnModel.getOffsetForColumnIndex(colIndex);
            var totalWidth = columnModel.getBodyContainerWidth();
            var viewport = that.gridPanel.eBodyViewport;
            if (offset + viewport.offsetWidth > totalWidth) {
                offset = columnModel.getBodyContainerWidth() - viewport.offsetWidth;
            }
            viewport.scrollLeft = offset;
        },
        // HB Extension
        getBodyScrollLeft: function() {
            return that.gridPanel.eBodyViewport.scrollLeft;
        },
        // HB Extension
        getOffsetForColumnIndex: function(colIndex) {
            return that.columnController.getModel().getOffsetForColumnIndex(colIndex);
        },
        // HB Extension
        openCloseGroupByName: function(name, open) {
            that.columnController.openCloseGroupByName(name, open);
        },
        // HB Extension
        registerGroupListener: function(listener) {
            that.columnController.registerGroupListener(listener);
        },
        // HB Extension
        openCloseAllColumnGroups: function(open) {
            that.columnController.openCloseAllColumnGroups(open);
        },
        // HB Extension
        editCellAtRowColumn: function(rowIndex, columnIndex) {
            return that.rowRenderer.editCellAtRowColumn(rowIndex, columnIndex);
        },
        refreshByRowColumn: function(rowIndex, columnIndex) {
            that.rowRenderer.refreshByRowColumn(rowIndex, columnIndex);
        },
        setDatasource: function(datasource) {
            that.setDatasource(datasource);
        },
        onNewDatasource: function() {
            that.setDatasource();
        },
        setRows: function(rows) {
            that.setRows(rows);
        },
        onNewRows: function() {
            that.setRows();
        },
        onNewCols: function() {
            that.onNewCols();
        },
        unselectAll: function() {
            console.error("unselectAll deprecated, call deselectAll instead");
            this.deselectAll();
        },
        refreshView: function() {
            that.rowRenderer.refreshView();
        },
        softRefreshView: function() {
            that.rowRenderer.softRefreshView();
        },
        refreshGroupRows: function() {
            that.rowRenderer.refreshGroupRows();
        },
        refreshHeader: function() {
            // need to review this - the refreshHeader should also refresh all icons in the header
            that.headerRenderer.refreshHeader();
            that.headerRenderer.updateFilterIcons();
        },
        getModel: function() {
            return that.rowModel;
        },
        onGroupExpandedOrCollapsed: function(refreshFromIndex) {
            that.updateModelAndRefresh(constants.STEP_MAP, refreshFromIndex);
        },
        expandAll: function() {
            that.inMemoryRowController.expandOrCollapseAll(true, null);
            that.updateModelAndRefresh(constants.STEP_MAP);
        },
        collapseAll: function() {
            that.inMemoryRowController.expandOrCollapseAll(false, null);
            that.updateModelAndRefresh(constants.STEP_MAP);
        },
        addVirtualRowListener: function(rowIndex, callback) {
            that.addVirtualRowListener(rowIndex, callback);
        },
        rowDataChanged: function(rows) {
            that.rowRenderer.rowDataChanged(rows);
        },
        setQuickFilter: function(newFilter) {
            that.onQuickFilterChanged(newFilter)
        },
        selectIndex: function(index, tryMulti, suppressEvents) {
            that.selectionController.selectIndex(index, tryMulti, suppressEvents);
        },
        deselectIndex: function(index) {
            that.selectionController.deselectIndex(index);
        },
        selectNode: function(node, tryMulti, suppressEvents) {
            that.selectionController.selectNode(node, tryMulti, suppressEvents);
        },
        deselectNode: function(node) {
            that.selectionController.deselectNode(node);
        },
        selectAll: function() {
            that.selectionController.selectAll();
            that.rowRenderer.refreshView();
        },
        deselectAll: function() {
            that.selectionController.deselectAll();
            that.rowRenderer.refreshView();
        },
        recomputeAggregates: function() {
            that.inMemoryRowController.doAggregate();
            that.rowRenderer.refreshGroupRows();
        },
        sizeColumnsToFit: function() {
            if (that.gridOptionsWrapper.isDontUseScrolls()) {
                console.warn('ag-grid: sizeColumnsToFit does not work when dontUseScrolls=true');
                return;
            }
            var availableWidth = that.gridPanel.getWidthForSizeColsToFit();
            that.columnController.sizeColumnsToFit(availableWidth);
        },
        showLoading: function(show) {
            that.showLoadingPanel(show);
        },
        isNodeSelected: function(node) {
            return that.selectionController.isNodeSelected(node);
        },
        getSelectedNodes: function() {
            return that.selectionController.getSelectedNodes();
        },
        getBestCostNodeSelection: function() {
            return that.selectionController.getBestCostNodeSelection();
        },
        ensureColIndexVisible: function(index) {
            that.gridPanel.ensureColIndexVisible(index);
        },
        ensureIndexVisible: function(index) {
            that.gridPanel.ensureIndexVisible(index);
        },
        ensureNodeVisible: function(comparator) {
            that.ensureNodeVisible(comparator);
        },
        forEachInMemory: function(callback) {
            that.rowModel.forEachInMemory(callback);
        },
        getFilterApiForColDef: function(colDef) {
            console.warn('ag-grid API method getFilterApiForColDef deprecated, use getFilterApi instead');
            return this.getFilterApi(colDef);
        },
        getFilterApi: function(key) {
            var column = that.columnModel.getColumn(key);
            return that.filterManager.getFilterApi(column);
        },
        getColumnDef: function(key) {
            var column = that.columnModel.getColumn(key);
            if (column) {
                return column.colDef;
            } else {
                return null;
            }
        },
        onFilterChanged: function() {
            that.onFilterChanged();
        },
        setSortModel: function(sortModel) {
            that.setSortModel(sortModel);
        },
        getSortModel: function() {
            return that.getSortModel();
        },
        setFilterModel: function(model) {
            that.filterManager.setFilterModel(model);
        },
        getFilterModel: function() {
            return that.getFilterModel();
        },
        getFocusedCell: function() {
            return that.rowRenderer.getFocusedCell();
        },
        setFocusedCell: function(rowIndex, colIndex) {
            that.setFocusedCell(rowIndex, colIndex);
        },
        showToolPanel: function(show) {
            that.showToolPanel(show);
        },
        isToolPanelShowing: function() {
            return that.isToolPanelShowing();
        },
        hideColumn: function(colId, hide) {
            that.columnController.hideColumns([colId], hide);
        },
        hideColumns: function(colIds, hide) {
            that.columnController.hideColumns(colIds, hide);
        }
    };
    this.gridOptions.api = api;
};

Grid.prototype.setFocusedCell = function(rowIndex, colIndex) {
    this.gridPanel.ensureIndexVisible(rowIndex);
    this.gridPanel.ensureColIndexVisible(colIndex);
    var that = this;
    setTimeout( function() {
        that.rowRenderer.setFocusedCell(rowIndex, colIndex);
    }, 10);
};

Grid.prototype.getSortModel = function() {
    var allColumns = this.columnModel.getAllColumns();
    var columnsWithSorting = [];
    var i;
    for (i = 0; i<allColumns.length; i++) {
        if (allColumns[i].sort) {
            columnsWithSorting.push(allColumns[i]);
        }
    }
    columnsWithSorting.sort( function(a,b) {
        return a.sortedAt - b.sortedAt;
    });

    var result = [];
    for (i = 0; i<columnsWithSorting.length; i++) {
        var resultEntry = {
            field: columnsWithSorting[i].colDef.field,
            sort: columnsWithSorting[i].sort
        };
        result.push(resultEntry);
    }

    return result;
};

Grid.prototype.setSortModel = function(sortModel) {
    if (!this.gridOptionsWrapper.isEnableSorting()) {
        console.warn('ag-grid: You are setting the sort model on a grid that does not have sorting enabled');
        return;
    }
    // first up, clear any previous sort
    var sortModelProvided = sortModel!==null && sortModel!==undefined && sortModel.length>0;
    var allColumns = this.columnModel.getAllColumns();
    for (var i = 0; i<allColumns.length; i++) {
        var column = allColumns[i];

        var sortForCol = null;
        var sortedAt = -1;
        if (sortModelProvided && !column.colDef.suppressSorting) {
            for (var j = 0; j<sortModel.length; j++) {
                var sortModelEntry = sortModel[j];
                if (typeof sortModelEntry.field === 'string'
                    && typeof column.colDef.field === 'string'
                    && sortModelEntry.field === column.colDef.field) {
                    sortForCol = sortModelEntry.sort;
                    sortedAt = j;
                }
            }
        }

        if (sortForCol) {
            column.sort = sortForCol;
            column.sortedAt = sortedAt;
        } else {
            column.sort = null;
            column.sortedAt = null;
        }
    }

    this.onSortingChanged();
};

Grid.prototype.onSortingChanged = function() {
    this.headerRenderer.updateSortIcons();
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        // if doing server side sorting, changing the sort has the impact
        // of resetting the datasource
        this.setDatasource();
    } else {
        // if doing in memory sorting, we just update the in memory data
        this.updateModelAndRefresh(constants.STEP_SORT);
    }
};

Grid.prototype.addVirtualRowListener = function(rowIndex, callback) {
    if (!this.virtualRowCallbacks[rowIndex]) {
        this.virtualRowCallbacks[rowIndex] = [];
    }
    this.virtualRowCallbacks[rowIndex].push(callback);
};

Grid.prototype.onVirtualRowSelected = function(rowIndex, selected) {
    // inform the callbacks of the event
    if (this.virtualRowCallbacks[rowIndex]) {
        this.virtualRowCallbacks[rowIndex].forEach(function(callback) {
            if (typeof callback.rowRemoved === 'function') {
                callback.rowSelected(selected);
            }
        });
    }
};

Grid.prototype.onVirtualRowRemoved = function(rowIndex) {
    // inform the callbacks of the event
    if (this.virtualRowCallbacks[rowIndex]) {
        this.virtualRowCallbacks[rowIndex].forEach(function(callback) {
            if (typeof callback.rowRemoved === 'function') {
                callback.rowRemoved();
            }
        });
    }
    // remove the callbacks
    delete this.virtualRowCallbacks[rowIndex];
};

Grid.prototype.onNewCols = function() {
    this.setupColumns();
    this.updateModelAndRefresh(constants.STEP_EVERYTHING);
};

Grid.prototype.updateBodyContainerWidthAfterColResize = function() {
    this.rowRenderer.setMainRowWidths();
    this.gridPanel.setBodyContainerWidth();
};

Grid.prototype.updatePinnedColContainerWidthAfterColResize = function() {
    this.gridPanel.setPinnedColContainerWidth();
};

Grid.prototype.doLayout = function() {
    // need to do layout first, as drawVirtualRows and setPinnedColHeight
    // need to know the result of the resizing of the panels.
    this.eRootPanel.doLayout();
    // both of the two below should be done in gridPanel, the gridPanel should register 'resize' to the panel
    this.rowRenderer.drawVirtualRows();
    this.gridPanel.setPinnedColHeight();
};

module.exports = Grid;

},{"./columnController":3,"./constants":4,"./expressionService":6,"./filter/filterManager":7,"./gridOptionsWrapper":16,"./gridPanel/gridPanel":19,"./headerRenderer":22,"./layout/borderLayout":24,"./rowControllers/inMemoryRowController":26,"./rowControllers/paginationController":27,"./rowControllers/virtualPageRowController":29,"./rowRenderer":30,"./selectionController":31,"./selectionRendererFactory":32,"./templateService":34,"./toolPanel/toolPanel":37,"./utils":38}],16:[function(require,module,exports){
var DEFAULT_ROW_HEIGHT = 30;

var constants = require('./constants');
function GridOptionsWrapper(gridOptions) {
    this.gridOptions = gridOptions;
    this.setupDefaults();
}

function isTrue(value) {
    return value === true || value === 'true';
}

GridOptionsWrapper.prototype.isRowSelection = function() { return this.gridOptions.rowSelection === "single" || this.gridOptions.rowSelection === "multiple"; };
GridOptionsWrapper.prototype.isRowDeselection = function() { return isTrue(this.gridOptions.rowDeselection); };
GridOptionsWrapper.prototype.isRowSelectionMulti = function() { return this.gridOptions.rowSelection === 'multiple'; };
GridOptionsWrapper.prototype.getContext = function() { return this.gridOptions.context; };
GridOptionsWrapper.prototype.isVirtualPaging = function() { return isTrue(this.gridOptions.virtualPaging); };
GridOptionsWrapper.prototype.isShowToolPanel = function() { return isTrue(this.gridOptions.showToolPanel); };
GridOptionsWrapper.prototype.isRowsAlreadyGrouped = function() { return isTrue(this.gridOptions.rowsAlreadyGrouped); };
GridOptionsWrapper.prototype.isGroupSelectsChildren = function() { return isTrue(this.gridOptions.groupSelectsChildren); };
GridOptionsWrapper.prototype.isGroupIncludeFooter = function() { return isTrue(this.gridOptions.groupIncludeFooter); };
GridOptionsWrapper.prototype.isSuppressRowClickSelection = function() { return isTrue(this.gridOptions.suppressRowClickSelection); };
GridOptionsWrapper.prototype.isSuppressCellSelection = function() { return isTrue(this.gridOptions.suppressCellSelection); };
GridOptionsWrapper.prototype.isSuppressUnSort = function() { return isTrue(this.gridOptions.suppressUnSort); };
GridOptionsWrapper.prototype.isSuppressMultiSort = function() { return isTrue(this.gridOptions.suppressMultiSort); };
GridOptionsWrapper.prototype.isGroupSuppressAutoColumn = function() { return isTrue(this.gridOptions.groupSuppressAutoColumn); };
GridOptionsWrapper.prototype.isGroupHeaders = function() { return isTrue(this.gridOptions.groupHeaders); };
GridOptionsWrapper.prototype.isDontUseScrolls = function() { return isTrue(this.gridOptions.dontUseScrolls); };
GridOptionsWrapper.prototype.isSuppressDescSort = function() { return isTrue(this.gridOptions.suppressDescSort); };
GridOptionsWrapper.prototype.getRowStyle = function() { return this.gridOptions.rowStyle; };
GridOptionsWrapper.prototype.isPinnedColAutoExpandWidth = function() { return isTrue(this.gridOptions.isPinnedColAutoExpandWidth); };
GridOptionsWrapper.prototype.getRowClass = function() { return this.gridOptions.rowClass; };
GridOptionsWrapper.prototype.getHeaderCellRenderer = function() { return this.gridOptions.headerCellRenderer; };
GridOptionsWrapper.prototype.getApi = function() { return this.gridOptions.api; };
GridOptionsWrapper.prototype.isEnableColResize = function() { return this.gridOptions.enableColResize; };
GridOptionsWrapper.prototype.getGroupDefaultExpanded = function() { return this.gridOptions.groupDefaultExpanded; };
GridOptionsWrapper.prototype.getGroupKeys = function() { return this.gridOptions.groupKeys; };
GridOptionsWrapper.prototype.getGroupAggFunction = function() { return this.gridOptions.groupAggFunction; };
GridOptionsWrapper.prototype.getGroupAggFields = function() { return this.gridOptions.groupAggFields; };
GridOptionsWrapper.prototype.getAllRows = function() { return this.gridOptions.rowData; };
GridOptionsWrapper.prototype.getDOMRowsChangedHandler = function() { return this.gridOptions.DOMRowsChangedHandler; };
GridOptionsWrapper.prototype.isGroupUseEntireRow = function() { return isTrue(this.gridOptions.groupUseEntireRow); };
GridOptionsWrapper.prototype.getGroupColumnDef = function() { return this.gridOptions.groupColumnDef; };
GridOptionsWrapper.prototype.isAngularCompileRows = function() { return isTrue(this.gridOptions.angularCompileRows); };
GridOptionsWrapper.prototype.isAngularCompileFilters = function() { return isTrue(this.gridOptions.angularCompileFilters); };
GridOptionsWrapper.prototype.isAngularCompileHeaders = function() { return isTrue(this.gridOptions.angularCompileHeaders); };
GridOptionsWrapper.prototype.getColumnDefs = function() { return this.gridOptions.columnDefs; };
GridOptionsWrapper.prototype.getRowHeight = function() { return this.gridOptions.rowHeight; };
GridOptionsWrapper.prototype.getModelUpdated = function() { return this.gridOptions.modelUpdated; };
GridOptionsWrapper.prototype.getCellClicked = function() { return this.gridOptions.cellClicked; };
GridOptionsWrapper.prototype.getCellDoubleClicked = function() { return this.gridOptions.cellDoubleClicked; };
GridOptionsWrapper.prototype.getCellValueChanged = function() { return this.gridOptions.cellValueChanged; };
GridOptionsWrapper.prototype.getCellFocused = function() { return this.gridOptions.cellFocused; };
GridOptionsWrapper.prototype.getRowSelected = function() { return this.gridOptions.rowSelected; };
GridOptionsWrapper.prototype.getSelectionChanged = function() { return this.gridOptions.selectionChanged; };
GridOptionsWrapper.prototype.getVirtualRowRemoved = function() { return this.gridOptions.virtualRowRemoved; };
GridOptionsWrapper.prototype.getDatasource = function() { return this.gridOptions.datasource; };
GridOptionsWrapper.prototype.getReady = function() { return this.gridOptions.ready; };
GridOptionsWrapper.prototype.getRowBuffer = function() { return this.gridOptions.rowBuffer; };

GridOptionsWrapper.prototype.getGroupRowInnerRenderer = function() {
    if (this.gridOptions.groupInnerRenderer) {
        console.warn('ag-grid: as of v1.10.0 (21st Jun 2015) groupInnerRenderer is nwo called groupRowInnerRenderer. Please change you code as groupInnerRenderer is deprecated.');
        return this.gridOptions.groupInnerRenderer;
    } else {
        return this.gridOptions.groupRowInnerRenderer;
    }
};

GridOptionsWrapper.prototype.getColWidth = function() {
    if (typeof this.gridOptions.colWidth !== 'number' ||  this.gridOptions.colWidth < constants.MIN_COL_WIDTH) {
        return 200;
    } else  {
        return this.gridOptions.colWidth;
    }
};

GridOptionsWrapper.prototype.isEnableSorting = function() { return isTrue(this.gridOptions.enableSorting) || isTrue(this.gridOptions.enableServerSideSorting); };
GridOptionsWrapper.prototype.isEnableServerSideSorting = function() { return isTrue(this.gridOptions.enableServerSideSorting); };

GridOptionsWrapper.prototype.isEnableFilter = function() { return isTrue(this.gridOptions.enableFilter) || isTrue(this.gridOptions.enableServerSideFilter); };
GridOptionsWrapper.prototype.isEnableServerSideFilter = function() { return this.gridOptions.enableServerSideFilter; };

GridOptionsWrapper.prototype.setSelectedRows = function(newSelectedRows) {
    return this.gridOptions.selectedRows = newSelectedRows;
};
GridOptionsWrapper.prototype.setSelectedNodesById = function(newSelectedNodes) {
    return this.gridOptions.selectedNodesById = newSelectedNodes;
};

GridOptionsWrapper.prototype.getIcons = function() {
    return this.gridOptions.icons;
};

GridOptionsWrapper.prototype.getHeaderHeight = function() {
    if (typeof this.gridOptions.headerHeight === 'number') {
        // if header height provided, used it
        return this.gridOptions.headerHeight;
    } else {
        // otherwise return 25 if no grouping, 50 if grouping
        if (this.isGroupHeaders()) {
            return 50;
        } else {
            return 25;
        }
    }
};

GridOptionsWrapper.prototype.setupDefaults = function() {
    if (!this.gridOptions.rowHeight) {
        this.gridOptions.rowHeight = DEFAULT_ROW_HEIGHT;
    }
};

GridOptionsWrapper.prototype.getPinnedColCount = function() {
    // if not using scrolls, then pinned columns doesn't make
    // sense, so always return 0
    if (this.isDontUseScrolls()) {
        return 0;
    }
    if (this.gridOptions.pinnedColumnCount) {
        //in case user puts in a string, cast to number
        return Number(this.gridOptions.pinnedColumnCount);
    } else {
        return 0;
    }
};

GridOptionsWrapper.prototype.getLocaleTextFunc = function() {
    var that = this;
    return function (key, defaultValue) {
        var localeText = that.gridOptions.localeText;
        if (localeText && localeText[key]) {
            return localeText[key];
        } else {
            return defaultValue;
        }
    };
};

module.exports = GridOptionsWrapper;

},{"./constants":4}],17:[function(require,module,exports){
module.exports = "<div><div class=ag-header><div class=ag-pinned-header></div><div class=ag-header-viewport><div class=ag-header-container></div></div></div><div class=ag-body><div class=ag-pinned-cols-viewport><div class=ag-pinned-cols-container></div></div><div class=ag-body-viewport-wrapper><div class=ag-body-viewport><div class=ag-body-container></div></div></div></div></div>";

},{}],18:[function(require,module,exports){
module.exports = "<div><div class=ag-header-container></div><div class=ag-body-container></div></div>";

},{}],19:[function(require,module,exports){
var gridHtml = require('./grid.html');
var gridNoScrollsHtml = require('./gridNoScrolls.html');
var loadingHtml = require('./loading.html');
var BorderLayout = require('../layout/borderLayout');
var utils = require('../utils');

function GridPanel(gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    // makes code below more readable if we pull 'forPrint' out
    this.forPrint = this.gridOptionsWrapper.isDontUseScrolls();
    this.setupComponents();
    this.scrollWidth = utils.getScrollbarWidth();
}

GridPanel.prototype.setupComponents = function() {

    if (this.forPrint) {
        this.eRoot = utils.loadTemplate(gridNoScrollsHtml);
        utils.addCssClass(this.eRoot, 'ag-root ag-no-scrolls');
    } else {
        this.eRoot = utils.loadTemplate(gridHtml);
        utils.addCssClass(this.eRoot, 'ag-root ag-scrolls');
    }

    this.findElements();

    this.layout = new BorderLayout({
        overlay: utils.loadTemplate(loadingHtml),
        center: this.eRoot,
        dontFill: this.forPrint,
        name: 'eGridPanel'
    });

    this.addScrollListener();
};

GridPanel.prototype.ensureIndexVisible = function(index) {
    var lastRow = this.rowModel.getVirtualRowCount();
    if (typeof index !== 'number' || index < 0 || index >= lastRow) {
        console.warn('invalid row index for ensureIndexVisible: ' + index);
        return;
    }

    var rowHeight = this.gridOptionsWrapper.getRowHeight();
    var rowTopPixel = rowHeight * index;
    var rowBottomPixel = rowTopPixel + rowHeight;

    var viewportTopPixel = this.eBodyViewport.scrollTop;
    var viewportHeight = this.eBodyViewport.offsetHeight;
    var scrollShowing = this.eBodyViewport.clientWidth < this.eBodyViewport.scrollWidth;
    if (scrollShowing) {
        viewportHeight -= this.scrollWidth;
    }
    var viewportBottomPixel = viewportTopPixel + viewportHeight;

    var viewportScrolledPastRow = viewportTopPixel > rowTopPixel;
    var viewportScrolledBeforeRow = viewportBottomPixel < rowBottomPixel;

    if (viewportScrolledPastRow) {
        // if row is before, scroll up with row at top
        this.eBodyViewport.scrollTop = rowTopPixel;
    } else if (viewportScrolledBeforeRow) {
        // if row is below, scroll down with row at bottom
        var newScrollPosition = rowBottomPixel - viewportHeight;
        this.eBodyViewport.scrollTop = newScrollPosition;
    }
    // otherwise, row is already in view, so do nothing
};

GridPanel.prototype.ensureColIndexVisible = function(index) {
    if (typeof index !== 'number') {
        console.warn('col index must be a number: ' + index);
        return;
    }

    var columns = this.columnModel.getDisplayedColumns();
    if (typeof index !== 'number' || index < 0 || index >= columns.length) {
        console.warn('invalid col index for ensureColIndexVisible: ' + index
            + ', should be between 0 and ' + (columns.length - 1));
        return;
    }

    var column = columns[index];
    var pinnedColCount = this.gridOptionsWrapper.getPinnedColCount();
    if (index < pinnedColCount) {
        console.warn('invalid col index for ensureColIndexVisible: ' + index
            + ', scrolling to a pinned col makes no sense');
        return;
    }

    // sum up all col width to the let to get the start pixel
    var colLeftPixel = 0;
    for (var i = pinnedColCount; i<index; i++) {
        colLeftPixel += columns[i].actualWidth;
    }

    var colRightPixel = colLeftPixel + column.actualWidth;

    var viewportLeftPixel = this.eBodyViewport.scrollLeft;
    var viewportWidth = this.eBodyViewport.offsetWidth;

    var scrollShowing = this.eBodyViewport.clientHeight < this.eBodyViewport.scrollHeight;
    if (scrollShowing) {
        viewportWidth -= this.scrollWidth;
    }

    var viewportRightPixel = viewportLeftPixel + viewportWidth;

    var viewportScrolledPastCol = viewportLeftPixel > colLeftPixel;
    var viewportScrolledBeforeCol = viewportRightPixel < colRightPixel;

    if (viewportScrolledPastCol) {
        // if viewport's left side is after col's left side, scroll right to pull col into viewport at left
        this.eBodyViewport.scrollLeft = colLeftPixel;
    } else if (viewportScrolledBeforeCol) {
        // if viewport's right side is before col's right side, scroll left to pull col into viewport at right
        var newScrollPosition = colRightPixel - viewportWidth;
        this.eBodyViewport.scrollLeft = newScrollPosition;
    }
    // otherwise, col is already in view, so do nothing
};

GridPanel.prototype.showLoading = function(loading) {
    this.layout.setOverlayVisible(loading);
};

GridPanel.prototype.getWidthForSizeColsToFit = function() {
    var availableWidth = this.eBody.clientWidth;
    var scrollShowing = this.eBodyViewport.clientHeight < this.eBodyViewport.scrollHeight;
    if (scrollShowing) {
        availableWidth -= this.scrollWidth;
    }
    return availableWidth;
};

GridPanel.prototype.init = function(columnModel, rowRenderer) {
    this.columnModel = columnModel;
    this.rowRenderer = rowRenderer;
};

GridPanel.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

GridPanel.prototype.getBodyContainer = function() { return this.eBodyContainer; };

GridPanel.prototype.getBodyViewport = function() { return this.eBodyViewport; };

GridPanel.prototype.getPinnedColsContainer = function() { return this.ePinnedColsContainer; };

GridPanel.prototype.getHeaderContainer = function() { return this.eHeaderContainer; };

GridPanel.prototype.getRoot = function() { return this.eRoot; };

GridPanel.prototype.getPinnedHeader = function() { return this.ePinnedHeader; };

GridPanel.prototype.getHeader = function() { return this.eHeader; };

GridPanel.prototype.getRowsParent = function() { return this.eParentOfRows; };

GridPanel.prototype.findElements = function() {
    if (this.forPrint) {
        this.eHeaderContainer = this.eRoot.querySelector(".ag-header-container");
        this.eBodyContainer = this.eRoot.querySelector(".ag-body-container");
        // for no-scrolls, all rows live in the body container
        this.eParentOfRows = this.eBodyContainer;
    } else {
        this.eBody = this.eRoot.querySelector(".ag-body");
        this.eBodyContainer = this.eRoot.querySelector(".ag-body-container");
        this.eBodyViewport = this.eRoot.querySelector(".ag-body-viewport");
        this.eBodyViewportWrapper = this.eRoot.querySelector(".ag-body-viewport-wrapper");
        this.ePinnedColsContainer = this.eRoot.querySelector(".ag-pinned-cols-container");
        this.ePinnedColsViewport = this.eRoot.querySelector(".ag-pinned-cols-viewport");
        this.ePinnedHeader = this.eRoot.querySelector(".ag-pinned-header");
        this.eHeader = this.eRoot.querySelector(".ag-header");
        this.eHeaderContainer = this.eRoot.querySelector(".ag-header-container");
        // for scrolls, all rows live in eBody (containing pinned and normal body)
        this.eParentOfRows = this.eBody;
    }
};

GridPanel.prototype.setBodyContainerWidth = function() {
    var mainRowWidth = this.columnModel.getBodyContainerWidth() + "px";
    this.eBodyContainer.style.width = mainRowWidth;
};

GridPanel.prototype.setPinnedColContainerWidth = function() {
    var pinnedColWidth = this.columnModel.getPinnedContainerWidth() + "px";
    //MV added code
    var visibleColumns = this.columnModel.getDisplayedColumns();
    var pinnedViewPortWidth = "";
    if(this.gridOptionsWrapper.isPinnedColAutoExpandWidth() && visibleColumns[visibleColumns.length - 1].pinned)
    {
        pinnedColWidth = "99%";
        pinnedViewPortWidth = "99.5%"
    }
    this.ePinnedColsViewport.style.width = pinnedViewPortWidth;
    //End MV added code
    this.ePinnedColsContainer.style.width = pinnedColWidth;
    this.eBodyViewportWrapper.style.marginLeft = pinnedColWidth;
};

GridPanel.prototype.showPinnedColContainersIfNeeded = function() {
    // no need to do this if not using scrolls
    if (this.forPrint) {
        return;
    }

    var showingPinnedCols = this.gridOptionsWrapper.getPinnedColCount() > 0;

    //some browsers had layout issues with the blank divs, so if blank,
    //we don't display them
    if (showingPinnedCols) {
        this.ePinnedHeader.style.display = 'inline-block';
        this.ePinnedColsViewport.style.display = 'inline';
    } else {
        this.ePinnedHeader.style.display = 'none';
        this.ePinnedColsViewport.style.display = 'none';
    }
};

GridPanel.prototype.setHeaderHeight = function() {
    var headerHeight = this.gridOptionsWrapper.getHeaderHeight();
    var headerHeightPixels = headerHeight + 'px';
    if (this.forPrint) {
        this.eHeaderContainer.style['height'] = headerHeightPixels;
    } else {
        this.eHeader.style['height'] = headerHeightPixels;
        this.eBody.style['paddingTop'] = headerHeightPixels;
    }
};

// see if a grey box is needed at the bottom of the pinned col
GridPanel.prototype.setPinnedColHeight = function() {
    if (!this.forPrint) {
        var bodyHeight = this.eBodyViewport.offsetHeight;
        this.ePinnedColsViewport.style.height = bodyHeight + "px";
    }
};

GridPanel.prototype.addScrollListener = function() {
    // if printing, then no scrolling, so no point in listening for scroll events
    if (this.forPrint) {
        return;
    }

    var that = this;
    var lastLeftPosition = -1;
    var lastTopPosition = -1;

    this.eBodyViewport.addEventListener("scroll", function() {
        var newLeftPosition = that.eBodyViewport.scrollLeft;
        var newTopPosition = that.eBodyViewport.scrollTop;

        if (newLeftPosition !== lastLeftPosition) {
            lastLeftPosition = newLeftPosition;
            that.scrollHeader(newLeftPosition);
        }

        if (newTopPosition !== lastTopPosition) {
            lastTopPosition = newTopPosition;
            that.scrollPinned(newTopPosition);
            that.rowRenderer.drawVirtualRows();
        }
    });

    this.ePinnedColsViewport.addEventListener("scroll", function() {
        // this means the pinned panel was moved, which can only
        // happen when the user is navigating in the pinned container
        // as the pinned col should never scroll. so we rollback
        // the scroll on the pinned.
        that.ePinnedColsViewport.scrollTop = 0;
    });

};

GridPanel.prototype.scrollHeader = function(bodyLeftPosition) {
    // this.eHeaderContainer.style.transform = 'translate3d(' + -bodyLeftPosition + "px,0,0)";
    this.eHeaderContainer.style.left = -bodyLeftPosition + "px";
};

GridPanel.prototype.scrollPinned = function(bodyTopPosition) {
    // this.ePinnedColsContainer.style.transform = 'translate3d(0,' + -bodyTopPosition + "px,0)";
    this.ePinnedColsContainer.style.top = -bodyTopPosition + "px";
};

module.exports = GridPanel;
},{"../layout/borderLayout":24,"../utils":38,"./grid.html":17,"./gridNoScrolls.html":18,"./loading.html":20}],20:[function(require,module,exports){
module.exports = "<div class=ag-loading-panel><div class=ag-loading-wrapper><span class=ag-loading-center>Loading...</span></div></div>";

},{}],21:[function(require,module,exports){
function GroupCreator() {}

GroupCreator.prototype.group = function(rowNodes, groupedCols, groupAggFunction, expandByDefault) {

    var topMostGroup = {
        level: -1,
        children: [],
        childrenMap: {}
    };

    var allGroups = [];
    allGroups.push(topMostGroup);

    var levelToInsertChild = groupedCols.length - 1;
    var i, currentLevel, node, data, currentGroup, groupByField, groupKey, nextGroup;

    // start at -1 and go backwards, as all the positive indexes
    // are already used by the nodes.
    var index = -1;

    for (i = 0; i < rowNodes.length; i++) {
        node = rowNodes[i];
        data = node.data;

        // all leaf nodes have the same level in this grouping, which is one level after the last group
        node.level = levelToInsertChild + 1;

        for (currentLevel = 0; currentLevel < groupedCols.length; currentLevel++) {
            groupByField = groupedCols[currentLevel].colDef.field;
            groupKey = data[groupByField];

            if (currentLevel == 0) {
                currentGroup = topMostGroup;
            }

            // if group doesn't exist yet, create it
            nextGroup = currentGroup.childrenMap[groupKey];
            if (!nextGroup) {
                nextGroup = {
                    group: true,
                    field: groupByField,
                    id: index--,
                    key: groupKey,
                    expanded: this.isExpanded(expandByDefault, currentLevel),
                    children: [],
                    // for top most level, parent is null
                    parent: currentGroup === topMostGroup ? null : currentGroup,
                    allChildrenCount: 0,
                    level: currentGroup.level + 1,
                    childrenMap: {} //this is a temporary map, we remove at the end of this method
                };
                currentGroup.childrenMap[groupKey] = nextGroup;
                currentGroup.children.push(nextGroup);
                allGroups.push(nextGroup);
            }

            nextGroup.allChildrenCount++;

            if (currentLevel == levelToInsertChild) {
                node.parent = nextGroup === topMostGroup ? null : nextGroup;
                nextGroup.children.push(node);
            } else {
                currentGroup = nextGroup;
            }
        }

    }

    //remove the temporary map
    for (i = 0; i < allGroups.length; i++) {
        delete allGroups[i].childrenMap;
    }

    return topMostGroup.children;
};

GroupCreator.prototype.isExpanded = function(expandByDefault, level) {
    if (typeof expandByDefault === 'number') {
        return level < expandByDefault;
    } else {
        return expandByDefault === true || expandByDefault === 'true';
    }
};

module.exports = new GroupCreator();

},{}],22:[function(require,module,exports){
var utils = require('./utils');
var SvgFactory = require('./svgFactory');
var constants = require('./constants');

var svgFactory = new SvgFactory();

function HeaderRenderer() {}

HeaderRenderer.prototype.init = function(gridOptionsWrapper, columnController, columnModel, gridPanel, angularGrid, filterManager, $scope, $compile, expressionService) {
    this.expressionService = expressionService;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.columnModel = columnModel;
    this.columnController = columnController;
    this.angularGrid = angularGrid;
    this.filterManager = filterManager;
    this.$scope = $scope;
    this.$compile = $compile;
    this.findAllElements(gridPanel);
};

HeaderRenderer.prototype.findAllElements = function(gridPanel) {
    this.ePinnedHeader = gridPanel.getPinnedHeader();
    this.eHeaderContainer = gridPanel.getHeaderContainer();
    this.eHeader = gridPanel.getHeader();
    this.eRoot = gridPanel.getRoot();
};

HeaderRenderer.prototype.refreshHeader = function() {
    utils.removeAllChildren(this.ePinnedHeader);
    utils.removeAllChildren(this.eHeaderContainer);

    if (this.childScopes) {
        this.childScopes.forEach(function(childScope) {
            childScope.$destroy();
        });
    }
    this.childScopes = [];

    if (this.gridOptionsWrapper.isGroupHeaders()) {
        this.insertHeadersWithGrouping();
    } else {
        this.insertHeadersWithoutGrouping();
    }

};

HeaderRenderer.prototype.insertHeadersWithGrouping = function() {
    var groups = this.columnModel.getHeaderGroups();
    var that = this;
    groups.forEach(function(group) {
        var eHeaderCell = that.createGroupedHeaderCell(group);
        var eContainerToAddTo = group.pinned ? that.ePinnedHeader : that.eHeaderContainer;
        eContainerToAddTo.appendChild(eHeaderCell);
    });
};

HeaderRenderer.prototype.createGroupedHeaderCell = function(group) {

    var eHeaderGroup = document.createElement('div');
    eHeaderGroup.className = 'ag-header-group';

    var eHeaderGroupCell = document.createElement('div');
    group.eHeaderGroupCell = eHeaderGroupCell;
    var classNames = ['ag-header-group-cell'];
    // having different classes below allows the style to not have a bottom border
    // on the group header, if no group is specified
    if (group.name) {
        classNames.push('ag-header-group-cell-with-group');
    } else {
        classNames.push('ag-header-group-cell-no-group');
    }
    if (group.expandable && !group.expanded) {
        classNames.push('ag-header-group-collapsed');
    } else {
        classNames.push('ag-header-group-expanded');
    }
    eHeaderGroupCell.className = classNames.join(' ');

    if (this.gridOptionsWrapper.isEnableColResize()) {
        var eHeaderCellResize = document.createElement("div");
        eHeaderCellResize.className = "ag-header-cell-resize";
        eHeaderGroupCell.appendChild(eHeaderCellResize);
        group.eHeaderCellResize = eHeaderCellResize;
        var dragCallback = this.groupDragCallbackFactory(group);
        this.addDragHandler(eHeaderCellResize, dragCallback);
    }

    // no renderer, default text render
    var groupName = group.name;
    if (groupName && groupName !== '') {
        var eGroupCellLabel = document.createElement("div");
        eGroupCellLabel.className = 'ag-header-group-cell-label';
        eHeaderGroupCell.appendChild(eGroupCellLabel);

        var eInnerText = document.createElement("span");
        eInnerText.className = 'ag-header-group-text';
        eInnerText.innerHTML = groupName;
        eGroupCellLabel.appendChild(eInnerText);

        if (group.expandable) {
            this.addGroupExpandIcon(group, eGroupCellLabel, group.expanded);
        }
    }
    eHeaderGroup.appendChild(eHeaderGroupCell);

    var that = this;
    group.displayedColumns.forEach(function(column) {
        var eHeaderCell = that.createHeaderCell(column, true, group);
        eHeaderGroup.appendChild(eHeaderCell);
    });

    that.setWidthOfGroupHeaderCell(group);

    return eHeaderGroup;
};

HeaderRenderer.prototype.addGroupExpandIcon = function(group, eHeaderGroup, expanded) {
    var eGroupIcon;
    if (expanded) {
        eGroupIcon = utils.createIcon('headerGroupOpened', this.gridOptionsWrapper, null, svgFactory.createArrowLeftSvg);
    } else {
        eGroupIcon = utils.createIcon('headerGroupClosed', this.gridOptionsWrapper, null, svgFactory.createArrowRightSvg);
    }
    eGroupIcon.className = 'ag-header-expand-icon';
    eHeaderGroup.appendChild(eGroupIcon);

    var that = this;
    eGroupIcon.onclick = function() {
        that.columnController.headerGroupOpened(group);
    };
};

HeaderRenderer.prototype.addDragHandler = function(eDraggableElement, dragCallback) {
    var that = this;
    eDraggableElement.addEventListener('mousedown', function(downEvent) {
        dragCallback.onDragStart();
        that.eRoot.style.cursor = "col-resize";
        that.dragStartX = downEvent.clientX;

        var listenersToRemove = {};

        listenersToRemove.mousemove = function (moveEvent) {
            var newX = moveEvent.clientX;
            var change = newX - that.dragStartX;
            dragCallback.onDragging(change);
        };

        listenersToRemove.mouseup = function () {
            that.stopDragging(listenersToRemove);
        };

        listenersToRemove.mouseleave = function () {
            that.stopDragging(listenersToRemove);
        };

        that.eRoot.addEventListener('mousemove', listenersToRemove.mousemove);
        that.eRoot.addEventListener('mouseup', listenersToRemove.mouseup);
        that.eRoot.addEventListener('mouseleave', listenersToRemove.mouseleave);
    });
};

HeaderRenderer.prototype.setWidthOfGroupHeaderCell = function(headerGroup) {
    var totalWidth = 0;
    headerGroup.displayedColumns.forEach(function(column) {
        totalWidth += column.actualWidth;
    });
    headerGroup.eHeaderGroupCell.style.width = utils.formatWidth(totalWidth);
    headerGroup.actualWidth = totalWidth;
};

HeaderRenderer.prototype.insertHeadersWithoutGrouping = function() {
    var ePinnedHeader = this.ePinnedHeader;
    var eHeaderContainer = this.eHeaderContainer;
    var that = this;

    this.columnModel.getDisplayedColumns().forEach(function(column) {
        // only include the first x cols
        var headerCell = that.createHeaderCell(column, false);
        if (column.pinned) {
            ePinnedHeader.appendChild(headerCell);
        } else {
            eHeaderContainer.appendChild(headerCell);
        }
    });
};

// private
HeaderRenderer.prototype.addHoverListener = function(colDef, headerCellLabel) {
    var that = this;
    if (colDef.headerHoverHandler) {
        headerCellLabel.addEventListener("mouseenter", function (e) {
            var hoverParams = {
                colDef: colDef,
                event: e,
                entering: true,
                leaving: false,
                context: that.gridOptionsWrapper.getContext(),
                api: that.gridOptionsWrapper.getApi()
            };
            colDef.headerHoverHandler(hoverParams);
        });
        headerCellLabel.addEventListener("mouseleave", function (e) {
            var hoverParams = {
                colDef: colDef,
                event: e,
                entering: false,
                leaving: true,
                context: that.gridOptionsWrapper.getContext(),
                api: that.gridOptionsWrapper.getApi()
            };
            colDef.headerHoverHandler(hoverParams);
        });
    }
};

HeaderRenderer.prototype.createHeaderCell = function(column, grouped, headerGroup) {
    var that = this;
    var colDef = column.colDef;
    var eHeaderCell = document.createElement("div");
    // stick the header cell in column, as we access it when group is re-sized
    column.eHeaderCell = eHeaderCell;

    var newChildScope;
    if (this.gridOptionsWrapper.isAngularCompileHeaders()) {
        newChildScope = this.$scope.$new();
        newChildScope.colDef = colDef;
        newChildScope.colIndex = colDef.index;
        newChildScope.colDefWrapper = column;
        this.childScopes.push(newChildScope);
    }

    var headerCellClasses = ['ag-header-cell'];
    if (grouped) {
        headerCellClasses.push('ag-header-cell-grouped'); // this takes 50% height
    } else {
        headerCellClasses.push('ag-header-cell-not-grouped'); // this takes 100% height
    }
    eHeaderCell.className = headerCellClasses.join(' ');

    this.addHeaderClassesFromCollDef(colDef, newChildScope, eHeaderCell);

    // add tooltip if exists
    if (colDef.headerTooltip) {
        eHeaderCell.title = colDef.headerTooltip;
    }

    if (this.gridOptionsWrapper.isEnableColResize() && !colDef.suppressResize) {
        var headerCellResize = document.createElement("div");
        headerCellResize.className = "ag-header-cell-resize";
        eHeaderCell.appendChild(headerCellResize);
        var dragCallback = this.headerDragCallbackFactory(eHeaderCell, column, headerGroup);
        this.addDragHandler(headerCellResize, dragCallback);
    }

    // filter button
    var showMenu = this.gridOptionsWrapper.isEnableFilter() && !colDef.suppressMenu;
    if (showMenu) {
        var eMenuButton = utils.createIcon('menu', this.gridOptionsWrapper, column, svgFactory.createMenuSvg);
        utils.addCssClass(eMenuButton, 'ag-header-icon');

        eMenuButton.setAttribute("class", "ag-header-cell-menu-button");
        eMenuButton.onclick = function() {
            that.filterManager.showFilter(column, this);
        };
        eHeaderCell.appendChild(eMenuButton);
        eHeaderCell.onmouseenter = function() {
            eMenuButton.style.opacity = 1;
        };
        eHeaderCell.onmouseleave = function() {
            eMenuButton.style.opacity = 0;
        };
        eMenuButton.style.opacity = 0;
        eMenuButton.style["-webkit-transition"] = "opacity 0.5s, border 0.2s";
        eMenuButton.style["transition"] = "opacity 0.5s, border 0.2s";
    }

    // label div
    var headerCellLabel = document.createElement("div");
    headerCellLabel.className = "ag-header-cell-label";

    this.addHoverListener(colDef, headerCellLabel);

    // add in sort icons
    if (this.gridOptionsWrapper.isEnableSorting() && !colDef.suppressSorting) {
        column.eSortAsc = utils.createIcon('sortAscending', this.gridOptionsWrapper, column, svgFactory.createArrowDownSvg);
        column.eSortDesc = utils.createIcon('sortDescending', this.gridOptionsWrapper, column, svgFactory.createArrowUpSvg);
        utils.addCssClass(column.eSortAsc, 'ag-header-icon');
        utils.addCssClass(column.eSortDesc, 'ag-header-icon');
        headerCellLabel.appendChild(column.eSortAsc);
        headerCellLabel.appendChild(column.eSortDesc);
        column.eSortAsc.style.display = 'none';
        column.eSortDesc.style.display = 'none';
        this.addSortHandling(headerCellLabel, column);
    } else if (colDef.headerClickHandler) {
        var params = {
            colDef: colDef,
            context: this.gridOptionsWrapper.getContext(),
            api: this.gridOptionsWrapper.getApi()
        };
        headerCellLabel.addEventListener("click", function(e) {
            params.event = e;
            colDef.headerClickHandler(params);
        });
    }

    // add in filter icon
    column.eFilterIcon = utils.createIcon('filter', this.gridOptionsWrapper, column, svgFactory.createFilterSvg);
    utils.addCssClass(column.eFilterIcon, 'ag-header-icon');
    headerCellLabel.appendChild(column.eFilterIcon);

    // render the cell, use a renderer if one is provided
    var headerCellRenderer;
    if (colDef.headerCellRenderer) { // first look for a renderer in col def
        headerCellRenderer = colDef.headerCellRenderer;
    } else if (this.gridOptionsWrapper.getHeaderCellRenderer()) { // second look for one in grid options
        headerCellRenderer = this.gridOptionsWrapper.getHeaderCellRenderer();
    }

    var headerNameValue = this.columnModel.getDisplayNameForCol(column);

    if (headerCellRenderer) {
        // renderer provided, use it
        var cellRendererParams = {
            colDef: colDef,
            $scope: newChildScope,
            context: this.gridOptionsWrapper.getContext(),
            value: headerNameValue,
            api: this.gridOptionsWrapper.getApi()
        };
        var cellRendererResult = headerCellRenderer(cellRendererParams);
        var childToAppend;
        if (utils.isNodeOrElement(cellRendererResult)) {
            // a dom node or element was returned, so add child
            childToAppend = cellRendererResult;
        } else {
            // otherwise assume it was html, so just insert
            var eTextSpan = document.createElement("span");
            eTextSpan.innerHTML = cellRendererResult;
            childToAppend = eTextSpan;
        }
        // angular compile header if option is turned on
        if (this.gridOptionsWrapper.isAngularCompileHeaders()) {
            var childToAppendCompiled = this.$compile(childToAppend)(newChildScope)[0];
            headerCellLabel.appendChild(childToAppendCompiled);
        } else {
            headerCellLabel.appendChild(childToAppend);
        }
    } else {
        // no renderer, default text render
        var eInnerText = document.createElement("span");
        eInnerText.className = 'ag-header-cell-text';
        eInnerText.innerHTML = headerNameValue;
        headerCellLabel.appendChild(eInnerText);
    }

    eHeaderCell.appendChild(headerCellLabel);
    eHeaderCell.style.width = utils.formatWidth(column.actualWidth);

    return eHeaderCell;
};

HeaderRenderer.prototype.addHeaderClassesFromCollDef = function(colDef, $childScope, eHeaderCell) {
    if (colDef.headerClass) {
        var classToUse;
        if (typeof colDef.headerClass === 'function') {
            var params = {
                colDef: colDef,
                $scope: $childScope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            classToUse = colDef.headerClass(params);
        } else {
            classToUse = colDef.headerClass;
        }

        if (typeof classToUse === 'string') {
            utils.addCssClass(eHeaderCell, classToUse);
        } else if (Array.isArray(classToUse)) {
            classToUse.forEach(function(cssClassItem) {
                utils.addCssClass(eHeaderCell, cssClassItem);
            });
        }
    }
};

HeaderRenderer.prototype.getNextSortDirection = function(direction) {
    var suppressUnSort = this.gridOptionsWrapper.isSuppressUnSort();
    var suppressDescSort = this.gridOptionsWrapper.isSuppressDescSort();

    switch (direction) {
        case constants.DESC:
            if (suppressUnSort) {
                return constants.ASC;
            } else {
                return null;
            }
        case constants.ASC:
            if (suppressUnSort && suppressDescSort) {
                return constants.ASC;
            } else if (suppressDescSort) {
                return null;
            } else {
                return constants.DESC;
            }
        default :
            return constants.ASC;
    }
};

HeaderRenderer.prototype.addSortHandling = function(headerCellLabel, column) {
    var that = this;

    headerCellLabel.addEventListener("click", function(e) {

        // update sort on current col
        column.sort = that.getNextSortDirection(column.sort);

        // sortedAt used for knowing order of cols when multi-col sort
        if (column.sort) {
            column.sortedAt = new Date().valueOf();
        } else {
            column.sortedAt = null;
        }

        var doingMultiSort = !that.gridOptionsWrapper.isSuppressMultiSort() && e.shiftKey;

        // clear sort on all columns except this one, and update the icons
        that.columnModel.getAllColumns().forEach(function(columnToClear) {
            // Do not clear if either holding shift, or if column in question was clicked
            if (!(doingMultiSort || columnToClear === column)) {
                columnToClear.sort = null;
            }
        });

        that.angularGrid.onSortingChanged();
    });
};

HeaderRenderer.prototype.updateSortIcons = function() {
    this.columnModel.getAllColumns().forEach(function(column) {
        // update visibility of icons
        var sortAscending = column.sort === constants.ASC;
        var sortDescending = column.sort === constants.DESC;

        if (column.eSortAsc) {
            utils.setVisible(column.eSortAsc, sortAscending);
        }
        if (column.eSortDesc) {
            utils.setVisible(column.eSortDesc, sortDescending);
        }
    });
};

HeaderRenderer.prototype.groupDragCallbackFactory = function(currentGroup) {
    var parent = this;
    var displayedColumns = currentGroup.displayedColumns;
    return {
        onDragStart: function() {
            this.groupWidthStart = currentGroup.actualWidth;
            this.childrenWidthStarts = [];
            var that = this;
            displayedColumns.forEach(function(colDefWrapper) {
                that.childrenWidthStarts.push(colDefWrapper.actualWidth);
            });
            this.minWidth = displayedColumns.length * constants.MIN_COL_WIDTH;
        },
        onDragging: function(dragChange) {

            var newWidth = this.groupWidthStart + dragChange;
            if (newWidth < this.minWidth) {
                newWidth = this.minWidth;
            }

            // set the new width to the group header
            var newWidthPx = newWidth + "px";
            currentGroup.eHeaderGroupCell.style.width = newWidthPx;
            currentGroup.actualWidth = newWidth;

            // distribute the new width to the child headers
            var changeRatio = newWidth / this.groupWidthStart;
            // keep track of pixels used, and last column gets the remaining,
            // to cater for rounding errors, and min width adjustments
            var pixelsToDistribute = newWidth;
            var that = this;
            currentGroup.displayedColumns.forEach(function(colDefWrapper, index) {
                var notLastCol = index !== (displayedColumns.length - 1);
                var newChildSize;
                if (notLastCol) {
                    // if not the last col, calculate the column width as normal
                    var startChildSize = that.childrenWidthStarts[index];
                    newChildSize = startChildSize * changeRatio;
                    if (newChildSize < constants.MIN_COL_WIDTH) {
                        newChildSize = constants.MIN_COL_WIDTH;
                    }
                    pixelsToDistribute -= newChildSize;
                } else {
                    // if last col, give it the remaining pixels
                    newChildSize = pixelsToDistribute;
                }
                var eHeaderCell = displayedColumns[index].eHeaderCell;
                parent.adjustColumnWidth(newChildSize, colDefWrapper, eHeaderCell);
            });

            // should not be calling these here, should do something else
            if (currentGroup.pinned) {
                parent.angularGrid.updatePinnedColContainerWidthAfterColResize();
            } else {
                parent.angularGrid.updateBodyContainerWidthAfterColResize();
            }
        }
    };
};

HeaderRenderer.prototype.adjustColumnWidth = function(newWidth, column, eHeaderCell) {
    var newWidthPx = newWidth + "px";
    var selectorForAllColsInCell = ".cell-col-" + column.index;
    var cellsForThisCol = this.eRoot.querySelectorAll(selectorForAllColsInCell);
    for (var i = 0; i < cellsForThisCol.length; i++) {
        cellsForThisCol[i].style.width = newWidthPx;
    }

    eHeaderCell.style.width = newWidthPx;
    column.actualWidth = newWidth;
};

// gets called when a header (not a header group) gets resized
HeaderRenderer.prototype.headerDragCallbackFactory = function(headerCell, column, headerGroup) {
    var parent = this;
    return {
        onDragStart: function() {
            this.startWidth = column.actualWidth;
        },
        onDragging: function(dragChange) {
            var newWidth = this.startWidth + dragChange;
            if (newWidth < constants.MIN_COL_WIDTH) {
                newWidth = constants.MIN_COL_WIDTH;
            }

            parent.adjustColumnWidth(newWidth, column, headerCell);

            if (headerGroup) {
                parent.setWidthOfGroupHeaderCell(headerGroup);
            }

            // should not be calling these here, should do something else
            if (column.pinned) {
                parent.angularGrid.updatePinnedColContainerWidthAfterColResize();
            } else {
                parent.angularGrid.updateBodyContainerWidthAfterColResize();
            }
        }
    };
};

HeaderRenderer.prototype.stopDragging = function(listenersToRemove) {
    this.eRoot.style.cursor = "";
    var that = this;
    utils.iterateObject(listenersToRemove, function(key, listener) {
        that.eRoot.removeEventListener(key, listener);
    });
};

HeaderRenderer.prototype.updateFilterIcons = function() {
    var that = this;
    this.columnModel.getDisplayedColumns().forEach(function(column) {
        // todo: need to change this, so only updates if column is visible
        if (column.eFilterIcon) {
            var filterPresent = that.filterManager.isFilterPresentForCol(column.colId);
            var displayStyle = filterPresent ? 'inline' : 'none';
            column.eFilterIcon.style.display = displayStyle;
        }
    });
};

module.exports = HeaderRenderer;

},{"./constants":4,"./svgFactory":33,"./utils":38}],23:[function(require,module,exports){
var utils = require('../utils');

function BorderLayout(params) {

    this.isLayoutPanel = true;

    this.fullHeight = !params.north && !params.south;

    var template;
    if (!params.dontFill) {
        if (this.fullHeight) {
            template =
                '<div style="height: 100%; overflow: auto; position: relative;">' +
                '<div id="west" style="height: 100%; float: left;"></div>' +
                '<div id="east" style="height: 100%; float: right;"></div>' +
                '<div id="center" style="height: 100%;"></div>' +
                '<div id="overlay" style="position: absolute; height: 100%; width: 100%; top: 0px; left: 0px;"></div>' +
                '</div>';
        } else {
            template =
                '<div style="height: 100%; position: relative;">' +
                '<div id="north"></div>' +
                '<div id="centerRow" style="height: 100%; overflow: hidden;">' +
                '<div id="west" style="height: 100%; float: left;"></div>' +
                '<div id="east" style="height: 100%; float: right;"></div>' +
                '<div id="center" style="height: 100%;"></div>' +
                '</div>' +
                '<div id="south"></div>' +
                '<div id="overlay" style="position: absolute; height: 100%; width: 100%; top: 0px; left: 0px;"></div>' +
                '</div>';
        }
        this.layoutActive = true;
    } else {
        template =
            '<div style="position: relative;">' +
                '<div id="north"></div>' +
                '<div id="centerRow">' +
                    '<div id="west"></div>' +
                    '<div id="east"></div>' +
                    '<div id="center"></div>' +
                '</div>' +
                '<div id="south"></div>' +
                '<div id="overlay" style="position: absolute; height: 100%; width: 100%; top: 0px; left: 0px;"></div>' +
            '</div>';
        this.layoutActive = false;
    }

    this.eGui = utils.loadTemplate(template);

    this.id = 'borderLayout';
    if (params.name) {
        this.id += '_' + params.name;
    }
    this.eGui.setAttribute('id', this.id);
    this.childPanels = [];

    if (params) {
        this.setupPanels(params);
    }

    this.setOverlayVisible(false);
}

BorderLayout.prototype.setupPanels = function(params) {
    this.eNorthWrapper = this.eGui.querySelector('#north');
    this.eSouthWrapper = this.eGui.querySelector('#south');
    this.eEastWrapper = this.eGui.querySelector('#east');
    this.eWestWrapper = this.eGui.querySelector('#west');
    this.eCenterWrapper = this.eGui.querySelector('#center');
    this.eOverlayWrapper = this.eGui.querySelector('#overlay');
    this.eCenterRow = this.eGui.querySelector('#centerRow');

    this.eNorthChildLayout = this.setupPanel(params.north, this.eNorthWrapper);
    this.eSouthChildLayout = this.setupPanel(params.south, this.eSouthWrapper);
    this.eEastChildLayout = this.setupPanel(params.east, this.eEastWrapper);
    this.eWestChildLayout = this.setupPanel(params.west, this.eWestWrapper);
    this.eCenterChildLayout = this.setupPanel(params.center, this.eCenterWrapper);

    this.setupPanel(params.overlay, this.eOverlayWrapper);
};

BorderLayout.prototype.setupPanel = function(content, ePanel) {
    if (!ePanel) {
        return;
    }
    if (content) {
        if (content.isLayoutPanel) {
            this.childPanels.push(content);
            ePanel.appendChild(content.getGui());
            return content;
        } else {
            ePanel.appendChild(content);
            return null;
        }
    } else {
        ePanel.parentNode.removeChild(ePanel);
        return null;
    }
};

BorderLayout.prototype.getGui = function() {
    return this.eGui;
};

BorderLayout.prototype.doLayout = function() {

    this.layoutChild(this.eNorthChildLayout);
    this.layoutChild(this.eSouthChildLayout);
    this.layoutChild(this.eEastChildLayout);
    this.layoutChild(this.eWestChildLayout);

    if (this.layoutActive) {
        this.layoutHeight();
        this.layoutWidth();
    }

    this.layoutChild(this.eCenterChildLayout);
};

BorderLayout.prototype.layoutChild = function(childPanel) {
    if (childPanel) {
        childPanel.doLayout();
    }
};

BorderLayout.prototype.layoutHeight = function() {
    if (this.fullHeight) {
        return;
    }

    var totalHeight = utils.offsetHeight(this.eGui);
    var northHeight = utils.offsetHeight(this.eNorthWrapper);
    var southHeight = utils.offsetHeight(this.eSouthWrapper);

    var centerHeight = totalHeight - northHeight - southHeight;
    if (centerHeight < 0) {
        centerHeight = 0;
    }

    this.eCenterRow.style.height = centerHeight + 'px';
};

BorderLayout.prototype.layoutWidth = function() {
    var totalWidth = utils.offsetWidth(this.eGui);
    var eastWidth = utils.offsetWidth(this.eEastWrapper);
    var westWidth = utils.offsetWidth(this.eWestWrapper);

    var centerWidth = totalWidth - eastWidth - westWidth;
    if (centerWidth < 0) {
        centerWidth = 0;
    }

    this.eCenterWrapper.style.width = centerWidth + 'px';
};

BorderLayout.prototype.setEastVisible = function(visible) {
    if (this.eEastWrapper) {
        this.eEastWrapper.style.display = visible ? '' : 'none';
    }
    this.doLayout();
};

BorderLayout.prototype.setOverlayVisible = function(visible) {
    if (this.eOverlayWrapper) {
        this.eOverlayWrapper.style.display = visible ? '' : 'none';
    }
    this.doLayout();
};

BorderLayout.prototype.setSouthVisible = function(visible) {
    if (this.eSouthWrapper) {
        this.eSouthWrapper.style.display = visible ? '' : 'none';
    }
    this.doLayout();
};

module.exports = BorderLayout;
},{"../utils":38}],24:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"../utils":38,"dup":23}],25:[function(require,module,exports){
var utils = require('../utils');

function VerticalStack() {

    this.isLayoutPanel = true;
    this.childPanels = [];
    this.eGui = document.createElement('div');
    this.eGui.style.height = '100%';
}

VerticalStack.prototype.addPanel = function(panel, height) {
    var component;
    if (panel.isLayoutPanel) {
        this.childPanels.push(panel);
        component = panel.getGui();
    } else {
        component = panel;
    }

    if (height) {
        component.style.height = height;
    }
    this.eGui.appendChild(component);
};

VerticalStack.prototype.getGui = function() {
    return this.eGui;
};

VerticalStack.prototype.doLayout = function() {
    for (var i = 0; i<this.childPanels.length; i++) {
        this.childPanels[i].doLayout();
    }
};

module.exports = VerticalStack;
},{"../utils":38}],26:[function(require,module,exports){
var groupCreator = require('./../groupCreator');
var utils = require('./../utils');
var constants = require('./../constants');

function InMemoryRowController() {
    this.createModel();
}

InMemoryRowController.prototype.init = function(gridOptionsWrapper, columnModel, angularGrid, filterManager, $scope, expressionService) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.columnModel = columnModel;
    this.angularGrid = angularGrid;
    this.filterManager = filterManager;
    this.$scope = $scope;
    this.expressionService = expressionService;

    this.allRows = null;
    this.rowsAfterGroup = null;
    this.rowsAfterFilter = null;
    this.rowsAfterSort = null;
    this.rowsAfterMap = null;
};

// private
InMemoryRowController.prototype.createModel = function() {
    var that = this;
    this.model = {
        // this method is implemented by the inMemory model only,
        // it gives the top level of the selection. used by the selection
        // controller, when it needs to do a full traversal
        getTopLevelNodes: function() {
            return that.rowsAfterGroup;
        },
        getVirtualRow: function(index) {
            return that.rowsAfterMap[index];
        },
        getVirtualRowCount: function() {
            if (that.rowsAfterMap) {
                return that.rowsAfterMap.length;
            } else {
                return 0;
            }
        },
        forEachInMemory: function(callback) {
            that.forEachInMemory(callback);
        }
    };
};

// public
InMemoryRowController.prototype.getModel = function() {
    return this.model;
};

// public
InMemoryRowController.prototype.forEachInMemory = function(callback) {

    // iterates through each item in memory, and calls the callback function
    function doCallback(list, callback) {
        if (list) {
            for (var i = 0; i<list.length; i++) {
                var item = list[i];
                callback(item);
                if (item.group && group.children) {
                    doCallback(group.children);
                }
            }
        }
    }

    doCallback(this.rowsAfterGroup, callback);
};

// public
InMemoryRowController.prototype.updateModel = function(step) {

    // fallthrough in below switch is on purpose
    switch (step) {
        case constants.STEP_EVERYTHING:
        case constants.STEP_FILTER:
            this.doFilter();
            this.doAggregate();
        case constants.STEP_SORT:
            this.doSort();
        case constants.STEP_MAP:
            this.doGroupMapping();
    }

    if (typeof this.gridOptionsWrapper.getModelUpdated() === 'function') {
        this.gridOptionsWrapper.getModelUpdated()();
        var $scope = this.$scope;
        if ($scope) {
            setTimeout(function() {
                $scope.$apply();
            }, 0);
        }
    }

};

// private
InMemoryRowController.prototype.defaultGroupAggFunctionFactory = function(groupAggFields) {
    return function groupAggFunction(rows) {

        var sums = {};

        for (var j = 0; j<groupAggFields.length; j++) {
            var colKey = groupAggFields[j];
            var totalForColumn = null;
            for (var i = 0; i<rows.length; i++) {
                var row = rows[i];
                var thisColumnValue = row.data[colKey];
                // only include if the value is a number
                if (typeof thisColumnValue === 'number') {
                    totalForColumn += thisColumnValue;
                }
            }
            // at this point, if no values were numbers, the result is null (not zero)
            sums[colKey] = totalForColumn;
        }

        return sums;

    };
};

// private
InMemoryRowController.prototype.getValue = function(data, colDef, node, rowIndex) {
    var api = this.gridOptionsWrapper.getApi();
    var context = this.gridOptionsWrapper.getContext();
    return utils.getValue(this.expressionService, data, colDef, node, rowIndex, api, context);
};

// public - it's possible to recompute the aggregate without doing the other parts
InMemoryRowController.prototype.doAggregate = function() {

    var groupAggFunction = this.gridOptionsWrapper.getGroupAggFunction();
    if (typeof groupAggFunction === 'function') {
        this.recursivelyCreateAggData(this.rowsAfterFilter, groupAggFunction);
        return;
    }

    var groupAggFields = this.gridOptionsWrapper.getGroupAggFields();
    if (groupAggFields) {
        var defaultAggFunction = this.defaultGroupAggFunctionFactory(groupAggFields);
        this.recursivelyCreateAggData(this.rowsAfterFilter, defaultAggFunction);
        return;
    }

};

// public
InMemoryRowController.prototype.expandOrCollapseAll = function(expand, rowNodes) {
    // if first call in recursion, we set list to parent list
    if (rowNodes === null) {
        rowNodes = this.rowsAfterGroup;
    }

    if (!rowNodes) {
        return;
    }

    var _this = this;
    rowNodes.forEach(function(node) {
        if (node.group) {
            node.expanded = expand;
            _this.expandOrCollapseAll(expand, node.children);
        }
    });
};

// private
InMemoryRowController.prototype.recursivelyCreateAggData = function(nodes, groupAggFunction) {
    for (var i = 0, l = nodes.length; i < l; i++) {
        var node = nodes[i];
        if (node.group) {
            // agg function needs to start at the bottom, so traverse first
            this.recursivelyCreateAggData(node.childrenAfterFilter, groupAggFunction);
            // after traversal, we can now do the agg at this level
            var data = groupAggFunction(node.childrenAfterFilter);
            node.data = data;
            // if we are grouping, then it's possible there is a sibling footer
            // to the group, so update the data here also if there is one
            if (node.sibling) {
                node.sibling.data = data;
            }
        }
    }
};

// private
InMemoryRowController.prototype.doSort = function() {
    var sorting;

    // if the sorting is already done by the server, then we should not do it here
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sorting = false;
    } else {
        //see if there is a col we are sorting by
        var sortingOptions = [];
        this.columnModel.getAllColumns().forEach(function(column) {
            if (column.sort) {
                var ascending = column.sort === constants.ASC;
                sortingOptions.push({
                    inverter: ascending ? 1 : -1,
                    sortedAt: column.sortedAt,
                    colDef: column.colDef
                });
            }
        });
        if (sortingOptions.length > 0) {
            sorting = true;
        }
    }

    var rowNodesReadyForSorting = this.rowsAfterFilter ? this.rowsAfterFilter.slice(0) : null;

    if (sorting) {
        // The columns are to be sorted in the order that the user selected them:
        sortingOptions.sort(function(optionA, optionB){
            return optionA.sortedAt - optionB.sortedAt;
        });
        this.sortList(rowNodesReadyForSorting, sortingOptions);
    } else {
        // if no sorting, set all group children after sort to the original list.
        // note: it is important to do this, even if doing server side sorting,
        // to allow the rows to pass to the next stage (ie set the node value
        // childrenAfterSort)
        this.recursivelyResetSort(rowNodesReadyForSorting);
    }

    this.rowsAfterSort = rowNodesReadyForSorting;
};

// private
InMemoryRowController.prototype.recursivelyResetSort = function(rowNodes) {
    if (!rowNodes) {
        return;
    }
    for (var i = 0, l = rowNodes.length; i < l; i++) {
        var item = rowNodes[i];
        if (item.group && item.children) {
            item.childrenAfterSort = item.childrenAfterFilter;
            this.recursivelyResetSort(item.children);
        }
    }
};

// private
InMemoryRowController.prototype.sortList = function(nodes, sortOptions) {

    // sort any groups recursively
    for (var i = 0, l = nodes.length; i < l; i++) { // critical section, no functional programming
        var node = nodes[i];
        if (node.group && node.children) {
            node.childrenAfterSort = node.childrenAfterFilter.slice(0);
            this.sortList(node.childrenAfterSort, sortOptions);
        }
    }

    var that = this;
    function compare(objA, objB, colDef){
        var valueA = that.getValue(objA.data, colDef, objA);
        var valueB = that.getValue(objB.data, colDef, objB);
        if (colDef.comparator) {
            //if comparator provided, use it
            return colDef.comparator(valueA, valueB, objA, objB);
        } else {
            //otherwise do our own comparison
            return utils.defaultComparator(valueA, valueB, objA, objB);
        }
    }

    nodes.sort(function(objA, objB) {
        // Iterate columns, return the first that doesn't match
        for (var i = 0, len = sortOptions.length; i < len; i++) {
            var sortOption = sortOptions[i];
            var compared = compare(objA, objB, sortOption.colDef);
            if (compared !== 0) {
                return compared * sortOption.inverter;
            }
        }
        // All matched, these are identical as far as the sort is concerned:
        return 0;
    });
};

// private
InMemoryRowController.prototype.doGrouping = function() {
    var rowsAfterGroup;
    var groupedCols = this.columnModel.getGroupedColumns();
    var rowsAlreadyGrouped = this.gridOptionsWrapper.isRowsAlreadyGrouped();

    var doingGrouping = !rowsAlreadyGrouped && groupedCols.length > 0;

    if (doingGrouping) {
        var expandByDefault = this.gridOptionsWrapper.getGroupDefaultExpanded();
        rowsAfterGroup = groupCreator.group(this.allRows, groupedCols,
            this.gridOptionsWrapper.getGroupAggFunction(), expandByDefault);
    } else {
        rowsAfterGroup = this.allRows;
    }
    this.rowsAfterGroup = rowsAfterGroup;
};

// private
InMemoryRowController.prototype.doFilter = function() {
    var doingFilter;

    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        doingFilter = false;
    } else {
        var quickFilterPresent = this.angularGrid.getQuickFilter() !== null;
        var advancedFilterPresent = this.filterManager.isFilterPresent();
        doingFilter = quickFilterPresent || advancedFilterPresent;
    }

    var rowsAfterFilter;
    if (doingFilter) {
        rowsAfterFilter = this.filterItems(this.rowsAfterGroup, quickFilterPresent, advancedFilterPresent);
    } else {
        // do it here
        rowsAfterFilter = this.rowsAfterGroup;
        this.recursivelyResetFilter(this.rowsAfterGroup);
    }
    this.rowsAfterFilter = rowsAfterFilter;
};

// private
InMemoryRowController.prototype.filterItems = function(rowNodes, quickFilterPresent, advancedFilterPresent) {
    var result = [];

    for (var i = 0, l = rowNodes.length; i < l; i++) {
        var node = rowNodes[i];

        if (node.group) {
            // deal with group
            node.childrenAfterFilter = this.filterItems(node.children, quickFilterPresent, advancedFilterPresent);
            if (node.childrenAfterFilter.length > 0) {
                node.allChildrenCount = this.getTotalChildCount(node.childrenAfterFilter);
                result.push(node);
            }
        } else {
            if (this.doesRowPassFilter(node, quickFilterPresent, advancedFilterPresent)) {
                result.push(node);
            }
        }
    }

    return result;
};

// private
InMemoryRowController.prototype.recursivelyResetFilter = function(nodes) {
    if (!nodes) {
        return;
    }
    for (var i = 0, l = nodes.length; i < l; i++) {
        var node = nodes[i];
        if (node.group && node.children) {
            node.childrenAfterFilter = node.children;
            node.allChildrenCount = this.getTotalChildCount(node.childrenAfterFilter);
            this.recursivelyResetFilter(node.children);
        }
    }
};

// private
// rows: the rows to put into the model
// firstId: the first id to use, used for paging, where we are not on the first page
InMemoryRowController.prototype.setAllRows = function(rows, firstId) {
    var nodes;
    if (this.gridOptionsWrapper.isRowsAlreadyGrouped()) {
        nodes = rows;
        this.recursivelyCheckUserProvidedNodes(nodes, null, 0);
    } else {
        // place each row into a wrapper
        var nodes = [];
        if (rows) {
            for (var i = 0; i < rows.length; i++) { // could be lots of rows, don't use functional programming
                nodes.push({
                    data: rows[i]
                });
            }
        }
    }

    // if firstId provided, use it, otherwise start at 0
    var firstIdToUse = firstId ? firstId : 0;
    this.recursivelyAddIdToNodes(nodes, firstIdToUse);
    this.allRows = nodes;

    // aggregate here, so filters have the agg data ready
    this.doGrouping();
};

// add in index - this is used by the selectionController - so quick
// to look up selected rows
InMemoryRowController.prototype.recursivelyAddIdToNodes = function(nodes, index) {
    if (!nodes) {
        return;
    }
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        node.id = index++;
        if (node.group && node.children) {
            index = this.recursivelyAddIdToNodes(node.children, index);
        }
    }
    return index;
};

// add in index - this is used by the selectionController - so quick
// to look up selected rows
InMemoryRowController.prototype.recursivelyCheckUserProvidedNodes = function(nodes, parent, level) {
    if (!nodes) {
        return;
    }
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (parent) {
            node.parent = parent;
        }
        node.level = level;
        if (node.group && node.children) {
            this.recursivelyCheckUserProvidedNodes(node.children, node, level + 1);
        }
    }
};

// private
InMemoryRowController.prototype.getTotalChildCount = function(rowNodes) {
    var count = 0;
    for (var i = 0, l = rowNodes.length; i < l; i++) {
        var item = rowNodes[i];
        if (item.group) {
            count += item.allChildrenCount;
        } else {
            count++;
        }
    }
    return count;
};

// private
InMemoryRowController.prototype.copyGroupNode = function(groupNode, children, allChildrenCount) {
    return {
        group: true,
        data: groupNode.data,
        field: groupNode.field,
        key: groupNode.key,
        expanded: groupNode.expanded,
        children: children,
        allChildrenCount: allChildrenCount,
        level: groupNode.level
    };
};

// private
InMemoryRowController.prototype.doGroupMapping = function() {
    // even if not going grouping, we do the mapping, as the client might
    // of passed in data that already has a grouping in it somewhere
    var rowsAfterMap = [];
    this.addToMap(rowsAfterMap, this.rowsAfterSort);
    this.rowsAfterMap = rowsAfterMap;
};

// private
InMemoryRowController.prototype.addToMap = function(mappedData, originalNodes) {
    if (!originalNodes) {
        return;
    }
    for (var i = 0; i < originalNodes.length; i++) {
        var node = originalNodes[i];
        mappedData.push(node);
        if (node.group && node.expanded) {
            this.addToMap(mappedData, node.childrenAfterSort);

            // put a footer in if user is looking for it
            if (this.gridOptionsWrapper.isGroupIncludeFooter()) {
                var footerNode = this.createFooterNode(node);
                mappedData.push(footerNode);
            }
        }
    }
};

// private
InMemoryRowController.prototype.createFooterNode = function(groupNode) {
    var footerNode = {};
    Object.keys(groupNode).forEach(function(key) {
        footerNode[key] = groupNode[key];
    });
    footerNode.footer = true;
    // get both header and footer to reference each other as siblings. this is never undone,
    // only overwritten. so if a group is expanded, then contracted, it will have a ghost
    // sibling - but that's fine, as we can ignore this if the header is contracted.
    footerNode.sibling = groupNode;
    groupNode.sibling = footerNode;
    return footerNode;
};

// private
InMemoryRowController.prototype.doesRowPassFilter = function(node, quickFilterPresent, advancedFilterPresent) {
    //first up, check quick filter
    if (quickFilterPresent) {
        if (!node.quickFilterAggregateText) {
            this.aggregateRowForQuickFilter(node);
        }
        if (node.quickFilterAggregateText.indexOf(this.angularGrid.getQuickFilter()) < 0) {
            //quick filter fails, so skip item
            return false;
        }
    }

    //second, check advanced filter
    if (advancedFilterPresent) {
        if (!this.filterManager.doesFilterPass(node)) {
            return false;
        }
    }

    //got this far, all filters pass
    return true;
};

// private
InMemoryRowController.prototype.aggregateRowForQuickFilter = function(node) {
    var aggregatedText = '';
    this.columnModel.getAllColumns().forEach(function(colDefWrapper) {
        var data = node.data;
        var value = data ? data[colDefWrapper.colDef.field] : null;
        if (value && value !== '') {
            aggregatedText = aggregatedText + value.toString().toUpperCase() + "_";
        }
    });
    node.quickFilterAggregateText = aggregatedText;
};

module.exports = InMemoryRowController;

},{"./../constants":4,"./../groupCreator":21,"./../utils":38}],27:[function(require,module,exports){
var template = require('./paginationPanel.html');
var utils = require('./../utils');

function PaginationController() {}

PaginationController.prototype.init = function(angularGrid, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.setupComponents();
    this.callVersion = 0;
};

PaginationController.prototype.setDatasource = function(datasource) {
    this.datasource = datasource;

    if (!datasource) {
        // only continue if we have a valid datasource to work with
        return;
    }

    this.reset();
};

PaginationController.prototype.reset = function() {
    // copy pageSize, to guard against it changing the the datasource between calls
    if (this.datasource.pageSize && typeof this.datasource.pageSize !== 'number') {
        console.warn('datasource.pageSize should be a number');
    }
    this.pageSize = this.datasource.pageSize;
    // see if we know the total number of pages, or if it's 'to be decided'
    if (typeof this.datasource.rowCount === 'number' && this.datasource.rowCount >= 0) {
        this.rowCount = this.datasource.rowCount;
        this.foundMaxRow = true;
        this.calculateTotalPages();
    } else {
        this.rowCount = 0;
        this.foundMaxRow = false;
        this.totalPages = null;
    }

    this.currentPage = 0;

    // hide the summary panel until something is loaded
    this.ePageRowSummaryPanel.style.visibility = 'hidden';

    this.setTotalLabels();
    this.loadPage();
};

PaginationController.prototype.setTotalLabels = function() {
    if (this.foundMaxRow) {
        this.lbTotal.innerHTML = this.totalPages.toLocaleString();
        this.lbRecordCount.innerHTML = this.rowCount.toLocaleString();
    } else {
        var moreText = this.gridOptionsWrapper.getLocaleTextFunc()('more', 'more');
        this.lbTotal.innerHTML = moreText;
        this.lbRecordCount.innerHTML = moreText;
    }
};

PaginationController.prototype.calculateTotalPages = function() {
    this.totalPages = Math.floor((this.rowCount - 1) / this.pageSize) + 1;
};

PaginationController.prototype.pageLoaded = function(rows, lastRowIndex) {
    var firstId = this.currentPage * this.pageSize;
    this.angularGrid.setRows(rows, firstId);
    // see if we hit the last row
    if (!this.foundMaxRow && typeof lastRowIndex === 'number' && lastRowIndex >= 0) {
        this.foundMaxRow = true;
        this.rowCount = lastRowIndex;
        this.calculateTotalPages();
        this.setTotalLabels();

        // if overshot pages, go back
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages - 1;
            this.loadPage();
        }
    }
    this.enableOrDisableButtons();
    this.updateRowLabels();
};

PaginationController.prototype.updateRowLabels = function() {
    var startRow;
    var endRow;
    if (this.isZeroPagesToDisplay()) {
        startRow = 0;
        endRow = 0;
    } else {
        startRow = (this.pageSize * this.currentPage) + 1;
        endRow = startRow + this.pageSize - 1;
        if (this.foundMaxRow && endRow > this.rowCount) {
            endRow = this.rowCount;
        }
    }
    this.lbFirstRowOnPage.innerHTML = (startRow).toLocaleString();
    this.lbLastRowOnPage.innerHTML = (endRow).toLocaleString();

    // show the summary panel, when first shown, this is blank
    this.ePageRowSummaryPanel.style.visibility = null;
};

PaginationController.prototype.loadPage = function() {
    this.enableOrDisableButtons();
    var startRow = this.currentPage * this.datasource.pageSize;
    var endRow = (this.currentPage + 1) * this.datasource.pageSize;

    this.lbCurrent.innerHTML = (this.currentPage + 1).toLocaleString();

    this.callVersion++;
    var callVersionCopy = this.callVersion;
    var that = this;
    this.angularGrid.showLoadingPanel(true);

    var sortModel;
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sortModel = this.angularGrid.getSortModel();
    }

    var filterModel;
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        filterModel = this.angularGrid.getFilterModel();
    }

    var params = {
        startRow: startRow,
        endRow: endRow,
        successCallback: successCallback,
        failCallback: failCallback,
        sortModel: sortModel,
        filterModel: filterModel
    };

    // check if old version of datasource used
    var getRowsParams = utils.getFunctionParameters(this.datasource.getRows);
    if (getRowsParams.length > 1) {
        console.warn('ag-grid: It looks like your paging datasource is of the old type, taking more than one parameter.');
        console.warn('ag-grid: From ag-grid 1.9.0, now the getRows takes one parameter. See the documentation for details.');
    }

    this.datasource.getRows(params);

    function successCallback(rows, lastRowIndex) {
        if (that.isCallDaemon(callVersionCopy)) {
            return;
        }
        that.pageLoaded(rows, lastRowIndex);
    }

    function failCallback() {
        if (that.isCallDaemon(callVersionCopy)) {
            return;
        }
        // set in an empty set of rows, this will at
        // least get rid of the loading panel, and
        // stop blocking things
        that.angularGrid.setRows([]);
    }
};

PaginationController.prototype.isCallDaemon = function(versionCopy) {
    return versionCopy !== this.callVersion;
};

PaginationController.prototype.onBtNext = function() {
    this.currentPage++;
    this.loadPage();
};

PaginationController.prototype.onBtPrevious = function() {
    this.currentPage--;
    this.loadPage();
};

PaginationController.prototype.onBtFirst = function() {
    this.currentPage = 0;
    this.loadPage();
};

PaginationController.prototype.onBtLast = function() {
    this.currentPage = this.totalPages - 1;
    this.loadPage();
};

PaginationController.prototype.isZeroPagesToDisplay = function() {
    return this.foundMaxRow && this.totalPages === 0;
};

PaginationController.prototype.enableOrDisableButtons = function() {
    var disablePreviousAndFirst = this.currentPage === 0;
    this.btPrevious.disabled = disablePreviousAndFirst;
    this.btFirst.disabled = disablePreviousAndFirst;

    var zeroPagesToDisplay = this.isZeroPagesToDisplay();
    var onLastPage = this.foundMaxRow && this.currentPage === (this.totalPages - 1);

    var disableNext = onLastPage || zeroPagesToDisplay;
    this.btNext.disabled = disableNext;

    var disableLast = !this.foundMaxRow || zeroPagesToDisplay || this.currentPage === (this.totalPages - 1);
    this.btLast.disabled = disableLast;
};

PaginationController.prototype.createTemplate = function() {
    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    return template
        .replace('[PAGE]', localeTextFunc('page', 'Page'))
        .replace('[TO]', localeTextFunc('to', 'to'))
        .replace('[OF]', localeTextFunc('of', 'of'))
        .replace('[OF]', localeTextFunc('of', 'of'))
        .replace('[FIRST]', localeTextFunc('first', 'First'))
        .replace('[PREVIOUS]', localeTextFunc('previous', 'Previous'))
        .replace('[NEXT]', localeTextFunc('next', 'Next'))
        .replace('[LAST]', localeTextFunc('last', 'Last'));
};

PaginationController.prototype.getGui= function() {
    return this.eGui;
};

PaginationController.prototype.setupComponents = function() {

    this.eGui = utils.loadTemplate(this.createTemplate());

    this.btNext = this.eGui.querySelector('#btNext');
    this.btPrevious = this.eGui.querySelector('#btPrevious');
    this.btFirst = this.eGui.querySelector('#btFirst');
    this.btLast = this.eGui.querySelector('#btLast');
    this.lbCurrent = this.eGui.querySelector('#current');
    this.lbTotal = this.eGui.querySelector('#total');

    this.lbRecordCount = this.eGui.querySelector('#recordCount');
    this.lbFirstRowOnPage = this.eGui.querySelector('#firstRowOnPage');
    this.lbLastRowOnPage = this.eGui.querySelector('#lastRowOnPage');
    this.ePageRowSummaryPanel = this.eGui.querySelector('#pageRowSummaryPanel');

    var that = this;

    this.btNext.addEventListener('click', function() {
        that.onBtNext();
    });

    this.btPrevious.addEventListener('click', function() {
        that.onBtPrevious();
    });

    this.btFirst.addEventListener('click', function() {
        that.onBtFirst();
    });

    this.btLast.addEventListener('click', function() {
        that.onBtLast();
    });
};

module.exports = PaginationController;

},{"./../utils":38,"./paginationPanel.html":28}],28:[function(require,module,exports){
module.exports = "<div class=ag-paging-panel><span id=pageRowSummaryPanel class=ag-paging-row-summary-panel><span id=firstRowOnPage></span> [TO] <span id=lastRowOnPage></span> [OF] <span id=recordCount></span></span> <span class=ag-paging-page-summary-panel><button class=ag-paging-button id=btFirst>[FIRST]</button> <button class=ag-paging-button id=btPrevious>[PREVIOUS]</button> [PAGE] <span id=current></span> [OF] <span id=total></span> <button class=ag-paging-button id=btNext>[NEXT]</button> <button class=ag-paging-button id=btLast>[LAST]</button></span></div>";

},{}],29:[function(require,module,exports){
/*
 * This row controller is used for infinite scrolling only. For normal 'in memory' table,
 * or standard pagination, the inMemoryRowController is used.
 */
var utils = require('./../utils');
var logging = false;

function VirtualPageRowController() {}

VirtualPageRowController.prototype.init = function(rowRenderer, gridOptionsWrapper, angularGrid) {
    this.rowRenderer = rowRenderer;
    this.datasourceVersion = 0;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
};

VirtualPageRowController.prototype.setDatasource = function(datasource) {
    this.datasource = datasource;

    if (!datasource) {
        // only continue if we have a valid datasource to working with
        return;
    }

    this.reset();
};

VirtualPageRowController.prototype.reset = function() {
    // see if datasource knows how many rows there are
    if (typeof this.datasource.rowCount === 'number' && this.datasource.rowCount >= 0) {
        this.virtualRowCount = this.datasource.rowCount;
        this.foundMaxRow = true;
    } else {
        this.virtualRowCount = 0;
        this.foundMaxRow = false;
    }

    // in case any daemon requests coming from datasource, we know it ignore them
    this.datasourceVersion++;

    // map of page numbers to rows in that page
    this.pageCache = {};
    this.pageCacheSize = 0;

    // if a number is in this array, it means we are pending a load from it
    this.pageLoadsInProgress = [];
    this.pageLoadsQueued = [];
    this.pageAccessTimes = {}; // keeps a record of when each page was last viewed, used for LRU cache
    this.accessTime = 0; // rather than using the clock, we use this counter

    // the number of concurrent loads we are allowed to the server
    if (typeof this.datasource.maxConcurrentRequests === 'number' && this.datasource.maxConcurrentRequests > 0) {
        this.maxConcurrentDatasourceRequests = this.datasource.maxConcurrentRequests;
    } else {
        this.maxConcurrentDatasourceRequests = 2;
    }

    // the number of pages to keep in browser cache
    if (typeof this.datasource.maxPagesInCache === 'number' && this.datasource.maxPagesInCache > 0) {
        this.maxPagesInCache = this.datasource.maxPagesInCache;
    } else {
        // null is default, means don't  have any max size on the cache
        this.maxPagesInCache = null;
    }

    this.pageSize = this.datasource.pageSize; // take a copy of page size, we don't want it changing
    this.overflowSize = this.datasource.overflowSize; // take a copy of page size, we don't want it changing

    this.doLoadOrQueue(0);
};

VirtualPageRowController.prototype.createNodesFromRows = function(pageNumber, rows) {
    var nodes = [];
    if (rows) {
        for (var i = 0, j = rows.length; i < j; i++) {
            var virtualRowIndex = (pageNumber * this.pageSize) + i;
            nodes.push({
                data: rows[i],
                id: virtualRowIndex
            });
        }
    }
    return nodes;
};

VirtualPageRowController.prototype.removeFromLoading = function(pageNumber) {
    var index = this.pageLoadsInProgress.indexOf(pageNumber);
    this.pageLoadsInProgress.splice(index, 1);
};

VirtualPageRowController.prototype.pageLoadFailed = function(pageNumber) {
    this.removeFromLoading(pageNumber);
    this.checkQueueForNextLoad();
};

VirtualPageRowController.prototype.pageLoaded = function(pageNumber, rows, lastRow) {
    this.putPageIntoCacheAndPurge(pageNumber, rows);
    this.checkMaxRowAndInformRowRenderer(pageNumber, lastRow);
    this.removeFromLoading(pageNumber);
    this.checkQueueForNextLoad();
};

VirtualPageRowController.prototype.putPageIntoCacheAndPurge = function(pageNumber, rows) {
    this.pageCache[pageNumber] = this.createNodesFromRows(pageNumber, rows);
    this.pageCacheSize++;
    if (logging) {
        console.log('adding page ' + pageNumber);
    }

    var needToPurge = this.maxPagesInCache && this.maxPagesInCache < this.pageCacheSize;
    if (needToPurge) {
        // find the LRU page
        var youngestPageIndex = this.findLeastRecentlyAccessedPage(Object.keys(this.pageCache));

        if (logging) {
            console.log('purging page ' + youngestPageIndex + ' from cache ' + Object.keys(this.pageCache));
        }
        delete this.pageCache[youngestPageIndex];
        this.pageCacheSize--;
    }

};

VirtualPageRowController.prototype.checkMaxRowAndInformRowRenderer = function(pageNumber, lastRow) {
    if (!this.foundMaxRow) {
        // if we know the last row, use if
        if (typeof lastRow === 'number' && lastRow >= 0) {
            this.virtualRowCount = lastRow;
            this.foundMaxRow = true;
        } else {
            // otherwise, see if we need to add some virtual rows
            var thisPagePlusBuffer = ((pageNumber + 1) * this.pageSize) + this.overflowSize;
            if (this.virtualRowCount < thisPagePlusBuffer) {
                this.virtualRowCount = thisPagePlusBuffer;
            }
        }
        // if rowCount changes, refreshView, otherwise just refreshAllVirtualRows
        this.rowRenderer.refreshView();
    } else {
        this.rowRenderer.refreshAllVirtualRows();
    }
};

VirtualPageRowController.prototype.isPageAlreadyLoading = function(pageNumber) {
    var result = this.pageLoadsInProgress.indexOf(pageNumber) >= 0 || this.pageLoadsQueued.indexOf(pageNumber) >= 0;
    return result;
};

VirtualPageRowController.prototype.doLoadOrQueue = function(pageNumber) {
    // if we already tried to load this page, then ignore the request,
    // otherwise server would be hit 50 times just to display one page, the
    // first row to find the page missing is enough.
    if (this.isPageAlreadyLoading(pageNumber)) {
        return;
    }

    // try the page load - if not already doing a load, then we can go ahead
    if (this.pageLoadsInProgress.length < this.maxConcurrentDatasourceRequests) {
        // go ahead, load the page
        this.loadPage(pageNumber);
    } else {
        // otherwise, queue the request
        this.addToQueueAndPurgeQueue(pageNumber);
    }
};

VirtualPageRowController.prototype.addToQueueAndPurgeQueue = function(pageNumber) {
    if (logging) {
        console.log('queueing ' + pageNumber + ' - ' + this.pageLoadsQueued);
    }
    this.pageLoadsQueued.push(pageNumber);

    // see if there are more pages queued that are actually in our cache, if so there is
    // no point in loading them all as some will be purged as soon as loaded
    var needToPurge = this.maxPagesInCache && this.maxPagesInCache < this.pageLoadsQueued.length;
    if (needToPurge) {
        // find the LRU page
        var youngestPageIndex = this.findLeastRecentlyAccessedPage(this.pageLoadsQueued);

        if (logging) {
            console.log('de-queueing ' + pageNumber + ' - ' + this.pageLoadsQueued);
        }

        var indexToRemove = this.pageLoadsQueued.indexOf(youngestPageIndex);
        this.pageLoadsQueued.splice(indexToRemove, 1);
    }
};

VirtualPageRowController.prototype.findLeastRecentlyAccessedPage = function(pageIndexes) {
    var youngestPageIndex = -1;
    var youngestPageAccessTime = Number.MAX_VALUE;
    var that = this;

    pageIndexes.forEach(function(pageIndex) {
        var accessTimeThisPage = that.pageAccessTimes[pageIndex];
        if (accessTimeThisPage < youngestPageAccessTime) {
            youngestPageAccessTime = accessTimeThisPage;
            youngestPageIndex = pageIndex;
        }
    });

    return youngestPageIndex;
};

VirtualPageRowController.prototype.checkQueueForNextLoad = function() {
    if (this.pageLoadsQueued.length > 0) {
        // take from the front of the queue
        var pageToLoad = this.pageLoadsQueued[0];
        this.pageLoadsQueued.splice(0, 1);

        if (logging) {
            console.log('dequeueing ' + pageToLoad + ' - ' + this.pageLoadsQueued);
        }

        this.loadPage(pageToLoad);
    }
};

VirtualPageRowController.prototype.loadPage = function(pageNumber) {

    this.pageLoadsInProgress.push(pageNumber);

    var startRow = pageNumber * this.pageSize;
    var endRow = (pageNumber + 1) * this.pageSize;

    var that = this;
    var datasourceVersionCopy = this.datasourceVersion;

    var sortModel;
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sortModel = this.angularGrid.getSortModel();
    }

    var filterModel;
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        filterModel = this.angularGrid.getFilterModel();
    }

    var params = {
        startRow: startRow,
        endRow: endRow,
        successCallback: successCallback,
        failCallback: failCallback,
        sortModel: sortModel,
        filterModel: filterModel
    };

    // check if old version of datasource used
    var getRowsParams = utils.getFunctionParameters(this.datasource.getRows);
    if (getRowsParams.length > 1) {
        console.warn('ag-grid: It looks like your paging datasource is of the old type, taking more than one parameter.');
        console.warn('ag-grid: From ag-grid 1.9.0, now the getRows takes one parameter. See the documentation for details.');
    }

    this.datasource.getRows(params);

    function successCallback(rows, lastRowIndex) {
        if (that.requestIsDaemon(datasourceVersionCopy)) {
            return;
        }
        that.pageLoaded(pageNumber, rows, lastRowIndex);
    }

    function failCallback() {
        if (that.requestIsDaemon(datasourceVersionCopy)) {
            return;
        }
        that.pageLoadFailed(pageNumber);
    }
};

// check that the datasource has not changed since the lats time we did a request
VirtualPageRowController.prototype.requestIsDaemon = function(datasourceVersionCopy) {
    return this.datasourceVersion !== datasourceVersionCopy;
};

VirtualPageRowController.prototype.getVirtualRow = function(rowIndex) {
    if (rowIndex > this.virtualRowCount) {
        return null;
    }

    var pageNumber = Math.floor(rowIndex / this.pageSize);
    var page = this.pageCache[pageNumber];

    // for LRU cache, track when this page was last hit
    this.pageAccessTimes[pageNumber] = this.accessTime++;

    if (!page) {
        this.doLoadOrQueue(pageNumber);
        // return back an empty row, so table can at least render empty cells
        return {
            data: {},
            id: rowIndex
        };
    } else {
        var indexInThisPage = rowIndex % this.pageSize;
        return page[indexInThisPage];
    }
};

VirtualPageRowController.prototype.forEachInMemory = function(callback) {
    var pageKeys = Object.keys(this.pageCache);
    for (var i = 0; i<pageKeys.length; i++) {
        var pageKey = pageKeys[i];
        var page = this.pageCache[pageKey];
        for (var j = 0; j<page.length; j++) {
            var node = page[j];
            callback(node);
        }
    }
};

VirtualPageRowController.prototype.getModel = function() {
    var that = this;
    return {
        getVirtualRow: function(index) {
            return that.getVirtualRow(index);
        },
        getVirtualRowCount: function() {
            return that.virtualRowCount;
        },
        forEachInMemory: function( callback ) {
            that.forEachInMemory(callback);
        }
    };
};

module.exports = VirtualPageRowController;

},{"./../utils":38}],30:[function(require,module,exports){
var constants = require('./constants');
var utils = require('./utils');
var groupCellRendererFactory = require('./cellRenderers/groupCellRendererFactory');

function RowRenderer() {}

RowRenderer.prototype.init = function(gridOptions, columnModel, gridOptionsWrapper, gridPanel,
    angularGrid, selectionRendererFactory, $compile, $scope,
    selectionController, expressionService, templateService) {
    this.gridOptions = gridOptions;
    this.columnModel = columnModel;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.selectionRendererFactory = selectionRendererFactory;
    this.gridPanel = gridPanel;
    this.$compile = $compile;
    this.$scope = $scope;
    this.selectionController = selectionController;
    this.expressionService = expressionService;
    this.templateService = templateService;
    this.findAllElements(gridPanel);

    this.cellRendererMap = {
        'group': groupCellRendererFactory(gridOptionsWrapper, selectionRendererFactory)
    };

    // map of row ids to row objects. keeps track of which elements
    // are rendered for which rows in the dom. each row object has:
    // [scope, bodyRow, pinnedRow, rowData]
    this.renderedRows = {};

    this.renderedRowStartEditingListeners = {};

    this.editingCell = false; //gets set to true when editing a cell
};

RowRenderer.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

RowRenderer.prototype.setMainRowWidths = function() {
    var mainRowWidth = this.columnModel.getBodyContainerWidth() + "px";

    var unpinnedRows = this.eBodyContainer.querySelectorAll(".ag-row");
    for (var i = 0; i < unpinnedRows.length; i++) {
        unpinnedRows[i].style.width = mainRowWidth;
    }
};

RowRenderer.prototype.findAllElements = function(gridPanel) {
    this.eBodyContainer = gridPanel.getBodyContainer();
    this.eBodyViewport = gridPanel.getBodyViewport();
    this.ePinnedColsContainer = gridPanel.getPinnedColsContainer();
    this.eParentOfRows = gridPanel.getRowsParent();
};

RowRenderer.prototype.refreshView = function(refreshFromIndex) {
    if (!this.gridOptionsWrapper.isDontUseScrolls()) {
        var rowCount = this.rowModel.getVirtualRowCount();
        var containerHeight = this.gridOptionsWrapper.getRowHeight() * rowCount;
        this.eBodyContainer.style.height = containerHeight + "px";
        this.ePinnedColsContainer.style.height = containerHeight + "px";
    }

    this.refreshAllVirtualRows(refreshFromIndex);
};

RowRenderer.prototype.softRefreshView = function() {

    var first = this.firstVirtualRenderedRow;
    var last = this.lastVirtualRenderedRow;

    var columns = this.columnModel.getDisplayedColumns();
    // if no cols, don't draw row
    if (!columns || columns.length === 0) {
        return;
    }

    for (var rowIndex = first; rowIndex <= last; rowIndex++) {
        var node = this.rowModel.getVirtualRow(rowIndex);
        if (node) {

            for (var colIndex = 0; colIndex < columns.length; colIndex++) {
                var column = columns[colIndex];
                var renderedRow = this.renderedRows[rowIndex];
                var eGridCell = renderedRow.eVolatileCells[column.colId];

                if (!eGridCell) {
                    continue;
                }

                var isFirstColumn = colIndex === 0;
                var scope = renderedRow.scope;

                this.softRefreshCell(eGridCell, isFirstColumn, node, column, scope, rowIndex);
            }
        }
    }
};

RowRenderer.prototype.softRefreshCell = function(eGridCell, isFirstColumn, node, column, scope, rowIndex) {

    utils.removeAllChildren(eGridCell);

    var data = this.getDataForNode(node);
    var valueGetter = this.createValueGetter(data, column.colDef, node);

    var value;
    if (valueGetter) {
        value = valueGetter();
    }

    this.populateAndStyleGridCell(valueGetter, value, eGridCell, isFirstColumn, node, column, rowIndex, scope);

    // if angular compiling, then need to also compile the cell again (angular compiling sucks, please wait...)
    if (this.gridOptionsWrapper.isAngularCompileRows()) {
        this.$compile(eGridCell)(scope);
    }
};

// HB addition
RowRenderer.prototype.refreshByRowColumn = function(rowIndex, columnIndex) {
    var renderedRow = this.renderedRows[rowIndex];
    if (renderedRow) {
        var column = this.columnModel.getAllColumns()[columnIndex];
        var eGridCell = renderedRow.eCells[column.colKey];
        this.softRefreshCell(eGridCell, columnIndex == 0, renderedRow.node, column, rowIndex, null);
    }
};

// HB addition
RowRenderer.prototype.editCellAtRowColumn = function(rowIndex, columnIndex) {
    return this.renderedRowStartEditingListeners[rowIndex][columnIndex]();
};

RowRenderer.prototype.rowDataChanged = function(rows) {
    // we only need to be worried about rendered rows, as this method is
    // called to whats rendered. if the row isn't rendered, we don't care
    var indexesToRemove = [];
    var renderedRows = this.renderedRows;
    Object.keys(renderedRows).forEach(function(key) {
        var renderedRow = renderedRows[key];
        // see if the rendered row is in the list of rows we have to update
        var rowNeedsUpdating = rows.indexOf(renderedRow.node.data) >= 0;
        if (rowNeedsUpdating) {
            indexesToRemove.push(key);
        }
    });
    // remove the rows
    this.removeVirtualRows(indexesToRemove);
    // add draw them again
    this.drawVirtualRows();
};

RowRenderer.prototype.refreshAllVirtualRows = function(fromIndex) {
    // remove all current virtual rows, as they have old data
    var rowsToRemove = Object.keys(this.renderedRows);
    this.removeVirtualRows(rowsToRemove, fromIndex);

    // add in new rows
    this.drawVirtualRows();
};

// public - removes the group rows and then redraws them again
RowRenderer.prototype.refreshGroupRows = function() {
    // find all the group rows
    var rowsToRemove = [];
    var that = this;
    Object.keys(this.renderedRows).forEach(function(key) {
        var renderedRow = that.renderedRows[key];
        var node = renderedRow.node;
        if (node.group) {
            rowsToRemove.push(key);
        }
    });
    // remove the rows
    this.removeVirtualRows(rowsToRemove);
    // and draw them back again
    this.ensureRowsRendered();
};

// takes array of row indexes
RowRenderer.prototype.removeVirtualRows = function(rowsToRemove, fromIndex) {
    var that = this;
    // if no fromIndex then set to -1, which will refresh everything
    var realFromIndex = (typeof fromIndex === 'number') ? fromIndex : -1;
    rowsToRemove.forEach(function(indexToRemove) {
        if (indexToRemove >= realFromIndex) {
            that.removeVirtualRow(indexToRemove);

            // if the row was last to have focus, we remove the fact that it has focus
            if (that.focusedCell && that.focusedCell.rowIndex == indexToRemove) {
                that.focusedCell = null;
            }
        }
    });
};

RowRenderer.prototype.removeVirtualRow = function(indexToRemove) {
    var renderedRow = this.renderedRows[indexToRemove];
    if (renderedRow.pinnedElement && this.ePinnedColsContainer) {
        this.ePinnedColsContainer.removeChild(renderedRow.pinnedElement);
    }

    if (renderedRow.bodyElement) {
        this.eBodyContainer.removeChild(renderedRow.bodyElement);
    }

    if (renderedRow.scope) {
        renderedRow.scope.$destroy();
    }

    if (this.gridOptionsWrapper.getVirtualRowRemoved()) {
        this.gridOptionsWrapper.getVirtualRowRemoved()(renderedRow.data, indexToRemove);
    }
    this.angularGrid.onVirtualRowRemoved(indexToRemove);

    delete this.renderedRows[indexToRemove];
    delete this.renderedRowStartEditingListeners[indexToRemove];
};

RowRenderer.prototype.drawVirtualRows = function() {
    var first;
    var last;

    var rowCount = this.rowModel.getVirtualRowCount();

    if (this.gridOptionsWrapper.isDontUseScrolls()) {
        first = 0;
        last = rowCount;
    } else {
        var topPixel = this.eBodyViewport.scrollTop;
        var bottomPixel = topPixel + this.eBodyViewport.offsetHeight;

        first = Math.floor(topPixel / this.gridOptionsWrapper.getRowHeight());
        last = Math.floor(bottomPixel / this.gridOptionsWrapper.getRowHeight());

        //add in buffer
        var buffer = this.gridOptionsWrapper.getRowBuffer() || constants.ROW_BUFFER_SIZE;
        first = first - buffer;
        last = last + buffer;

        // adjust, in case buffer extended actual size
        if (first < 0) {
            first = 0;
        }
        if (last > rowCount - 1) {
            last = rowCount - 1;
        }
    }

    this.firstVirtualRenderedRow = first;
    this.lastVirtualRenderedRow = last;

    this.ensureRowsRendered();
};

RowRenderer.prototype.getFirstVirtualRenderedRow = function() {
    return this.firstVirtualRenderedRow;
};

RowRenderer.prototype.getLastVirtualRenderedRow = function() {
    return this.lastVirtualRenderedRow;
};

RowRenderer.prototype.ensureRowsRendered = function() {

    var mainRowWidth = this.columnModel.getBodyContainerWidth();
    var that = this;
    var rowsInserted = false;

    // at the end, this array will contain the items we need to remove
    var rowsToRemove = Object.keys(this.renderedRows);

    // add in new rows
    for (var rowIndex = this.firstVirtualRenderedRow; rowIndex <= this.lastVirtualRenderedRow; rowIndex++) {
        // see if item already there, and if yes, take it out of the 'to remove' array
        if (rowsToRemove.indexOf(rowIndex.toString()) >= 0) {
            rowsToRemove.splice(rowsToRemove.indexOf(rowIndex.toString()), 1);
            continue;
        }
        // check this row actually exists (in case overflow buffer window exceeds real data)
        var node = this.rowModel.getVirtualRow(rowIndex);
        if (node) {
            that.insertRow(node, rowIndex, mainRowWidth);
            rowsInserted = true;
        }
    }

    // at this point, everything in our 'rowsToRemove' . . .
    this.removeVirtualRows(rowsToRemove);

    var domRowsChangedFn = this.gridOptionsWrapper.getDOMRowsChangedHandler();

    //Notify outside world that dom rows changed.
    if((rowsInserted || rowsToRemove.length > 0) && domRowsChangedFn){
        //get all currently rendered rows in dom.
        var rowsInDOM = [];
        Object.keys(that.renderedRows).forEach(function(key) {
            rowsInDOM.push(that.renderedRows[key].node.data);
        });
        domRowsChangedFn(rowsInDOM);
    }

    // if we are doing angular compiling, then do digest the scope here
    if (this.gridOptionsWrapper.isAngularCompileRows()) {
        // we do it in a timeout, in case we are already in an apply
        setTimeout(function() {
            that.$scope.$apply();
        }, 0);
    }
};

RowRenderer.prototype.insertRow = function(node, rowIndex, mainRowWidth) {
    var columns = this.columnModel.getDisplayedColumns();
    // if no cols, don't draw row
    if (!columns || columns.length == 0) {
        return;
    }

    // var rowData = node.rowData;
    var rowIsAGroup = node.group;

    // try compiling as we insert rows
    var newChildScope = this.createChildScopeOrNull(node.data);

    var ePinnedRow = this.createRowContainer(rowIndex, node, rowIsAGroup, newChildScope);
    var eMainRow = this.createRowContainer(rowIndex, node, rowIsAGroup, newChildScope);
    var that = this;

    eMainRow.style.width = mainRowWidth + "px";

    var renderedRow = {
        scope: newChildScope,
        node: node,
        rowIndex: rowIndex,
        eCells: {},
        eVolatileCells: {}
    };
    this.renderedRows[rowIndex] = renderedRow;
    this.renderedRowStartEditingListeners[rowIndex] = {};

    // if group item, insert the first row
    var groupHeaderTakesEntireRow = this.gridOptionsWrapper.isGroupUseEntireRow();
    var drawGroupRow = rowIsAGroup && groupHeaderTakesEntireRow;

    if (drawGroupRow) {
        var firstColumn = columns[0];

        var eGroupRow = that.createGroupElement(node, rowIndex, false);
        if (firstColumn.pinned) {
            ePinnedRow.appendChild(eGroupRow);

            var eGroupRowPadding = that.createGroupElement(node, rowIndex, true);
            eMainRow.appendChild(eGroupRowPadding);
        } else {
            eMainRow.appendChild(eGroupRow);
        }

    } else {

        columns.forEach(function(column, index) {
            var firstCol = index === 0;
            var data = that.getDataForNode(node);
            var valueGetter = that.createValueGetter(data, column.colDef, node);
            that.createCellFromColDef(firstCol, column, valueGetter, node, rowIndex, eMainRow, ePinnedRow, newChildScope, renderedRow);
        });
    }

    //try compiling as we insert rows
    renderedRow.pinnedElement = this.compileAndAdd(this.ePinnedColsContainer, rowIndex, ePinnedRow, newChildScope);
    renderedRow.bodyElement = this.compileAndAdd(this.eBodyContainer, rowIndex, eMainRow, newChildScope);
};

// if group is a footer, always show the data.
// if group is a header, only show data if not expanded
RowRenderer.prototype.getDataForNode = function(node) {
    if (node.footer) {
        // if footer, we always show the data
        return node.data;
    } else if (node.group) {
        // if header and header is expanded, we show data in footer only
        var footersEnabled = this.gridOptionsWrapper.isGroupIncludeFooter();
        return (node.expanded && footersEnabled) ? undefined : node.data;
    } else {
        // otherwise it's a normal node, just return data as normal
        return node.data;
    }
};

RowRenderer.prototype.createValueGetter = function(data, colDef, node) {
    var that = this;
    return function() {
        var api = that.gridOptionsWrapper.getApi();
        var context = that.gridOptionsWrapper.getContext();
        return utils.getValue(that.expressionService, data, colDef, node, api, context);
    };
};

RowRenderer.prototype.createChildScopeOrNull = function(data) {
    if (this.gridOptionsWrapper.isAngularCompileRows()) {
        var newChildScope = this.$scope.$new();
        newChildScope.data = data;
        return newChildScope;
    } else {
        return null;
    }
};

RowRenderer.prototype.compileAndAdd = function(container, rowIndex, element, scope) {
    if (scope) {
        var eElementCompiled = this.$compile(element)(scope);
        if (container) { // checking container, as if noScroll, pinned container is missing
            container.appendChild(eElementCompiled[0]);
        }
        return eElementCompiled[0];
    } else {
        if (container) {
            container.appendChild(element);
        }
        return element;
    }
};

RowRenderer.prototype.createCellFromColDef = function(isFirstColumn, column, valueGetter, node, rowIndex, eMainRow, ePinnedRow, $childScope, renderedRow) {
    var eGridCell = this.createCell(isFirstColumn, column, valueGetter, node, rowIndex, $childScope);

    if (column.colDef.volatile) {
        renderedRow.eVolatileCells[column.colId] = eGridCell;
    }
    renderedRow.eCells[column.colId] = eGridCell;

    if (column.pinned) {
        ePinnedRow.appendChild(eGridCell);
    } else {
        eMainRow.appendChild(eGridCell);
    }
};

RowRenderer.prototype.addClassesToRow = function(rowIndex, node, eRow) {
    var classesList = ["ag-row"];
    classesList.push(rowIndex % 2 == 0 ? "ag-row-even" : "ag-row-odd");

    if (this.selectionController.isNodeSelected(node)) {
        classesList.push("ag-row-selected");
    }
    if (node.group) {
        // if a group, put the level of the group in
        classesList.push("ag-row-level-" + node.level);
    } else {
        // if a leaf, and a parent exists, put a level of the parent, else put level of 0 for top level item
        if (node.parent) {
            classesList.push("ag-row-level-" + (node.parent.level + 1));
        } else {
            classesList.push("ag-row-level-0");
        }
    }
    if (node.group) {
        classesList.push("ag-row-group");
    }
    if (node.group && !node.footer && node.expanded) {
        classesList.push("ag-row-group-expanded");
    }
    if (node.group && !node.footer && !node.expanded) {
        // opposite of expanded is contracted according to the internet.
        classesList.push("ag-row-group-contracted");
    }
    if (node.group && node.footer) {
        classesList.push("ag-row-footer");
    }

    // add in extra classes provided by the config
    if (this.gridOptionsWrapper.getRowClass()) {
        var params = {
            node: node,
            data: node.data,
            rowIndex: rowIndex,
            context: this.gridOptionsWrapper.getContext(),
            api: this.gridOptionsWrapper.getApi()
        };
        var extraRowClasses = this.gridOptionsWrapper.getRowClass()(params);
        if (extraRowClasses) {
            if (typeof extraRowClasses === 'string') {
                classesList.push(extraRowClasses);
            } else if (Array.isArray(extraRowClasses)) {
                extraRowClasses.forEach(function(classItem) {
                    classesList.push(classItem);
                });
            }
        }
    }

    var classes = classesList.join(" ");

    eRow.className = classes;
};

RowRenderer.prototype.createRowContainer = function(rowIndex, node, groupRow, $scope) {
    var eRow = document.createElement("div");

    this.addClassesToRow(rowIndex, node, eRow);

    eRow.setAttribute('row', rowIndex);

    // if showing scrolls, position on the container
    if (!this.gridOptionsWrapper.isDontUseScrolls()) {
        eRow.style.top = (this.gridOptionsWrapper.getRowHeight() * rowIndex) + "px";
    }
    eRow.style.height = (this.gridOptionsWrapper.getRowHeight()) + "px";

    if (this.gridOptionsWrapper.getRowStyle()) {
        var cssToUse;
        var rowStyle = this.gridOptionsWrapper.getRowStyle();
        if (typeof rowStyle === 'function') {
            var params = {
                data: node.data,
                node: node,
                api: this.gridOptionsWrapper.getApi(),
                context: this.gridOptionsWrapper.getContext(),
                $scope: $scope
            };
            cssToUse = rowStyle(params);
        } else {
            cssToUse = rowStyle;
        }

        if (cssToUse) {
            Object.keys(cssToUse).forEach(function(key) {
                eRow.style[key] = cssToUse[key];
            });
        }
    }

    var _this = this;
    eRow.addEventListener("click", function(event) {
        _this.angularGrid.onRowClicked(event, Number(this.getAttribute("row")), node)
    });

    return eRow;
};

RowRenderer.prototype.getIndexOfRenderedNode = function(node) {
    var renderedRows = this.renderedRows;
    var keys = Object.keys(renderedRows);
    for (var i = 0; i < keys.length; i++) {
        if (renderedRows[keys[i]].node === node) {
            return renderedRows[keys[i]].rowIndex;
        }
    }
    return -1;
};

RowRenderer.prototype.createGroupElement = function(node, rowIndex, padding) {
    var eRow;
    // padding means we are on the right hand side of a pinned table, ie
    // in the main body.
    if (padding) {
        eRow = document.createElement('span');
    } else {
        var params = {
            node: node,
            data: node.data,
            rowIndex: rowIndex,
            api: this.gridOptionsWrapper.getApi(),
            colDef: {
                cellRenderer: {
                    renderer: 'group',
                    innerRenderer: this.gridOptionsWrapper.getGroupRowInnerRenderer()
                }
            }
        };
        eRow = this.cellRendererMap['group'](params);
    }

    if (node.footer) {
        utils.addCssClass(eRow, 'ag-footer-cell-entire-row');
    } else {
        utils.addCssClass(eRow, 'ag-group-cell-entire-row');
    }

    return eRow;
};

RowRenderer.prototype.putDataIntoCell = function(column, value, valueGetter, node, $childScope, eSpanWithValue, eGridCell, rowIndex, refreshCellFunction) {
    // template gets preference, then cellRenderer, then do it ourselves
    var colDef = column.colDef;
    if (colDef.template) {
        eSpanWithValue.innerHTML = colDef.template;
    } else if (colDef.templateUrl) {
        var template = this.templateService.getTemplate(colDef.templateUrl, refreshCellFunction);
        if (template) {
            eSpanWithValue.innerHTML = template;
        }
    } else if (colDef.cellRenderer) {
        this.useCellRenderer(column, value, node, $childScope, eSpanWithValue, rowIndex, refreshCellFunction, valueGetter, eGridCell);
    } else {
        // if we insert undefined, then it displays as the string 'undefined', ugly!
        if (value !== undefined && value !== null && value !== '') {
            eSpanWithValue.innerHTML = value;
        }
    }
};

RowRenderer.prototype.useCellRenderer = function(column, value, node, $childScope, eSpanWithValue, rowIndex, refreshCellFunction, valueGetter, eGridCell) {
    var colDef = column.colDef;
    var rendererParams = {
        value: value,
        valueGetter: valueGetter,
        data: node.data,
        node: node,
        colDef: colDef,
        column: column,
        $scope: $childScope,
        rowIndex: rowIndex,
        api: this.gridOptionsWrapper.getApi(),
        context: this.gridOptionsWrapper.getContext(),
        refreshCell: refreshCellFunction,
        eGridCell: eGridCell
    };
    var cellRenderer;
    if (typeof colDef.cellRenderer === 'object' && colDef.cellRenderer !== null) {
        cellRenderer = this.cellRendererMap[colDef.cellRenderer.renderer];
        if (!cellRenderer) {
            throw 'Cell renderer ' + colDef.cellRenderer + ' not found, available are ' + Object.keys(this.cellRendererMap);
        }
    } else if (typeof colDef.cellRenderer === 'function') {
        cellRenderer = colDef.cellRenderer;
    } else {
        throw 'Cell Renderer must be String or Function';
    }
    var resultFromRenderer = cellRenderer(rendererParams);
    if (utils.isNodeOrElement(resultFromRenderer)) {
        // a dom node or element was returned, so add child
        eSpanWithValue.appendChild(resultFromRenderer);
    } else {
        // otherwise assume it was html, so just insert
        eSpanWithValue.innerHTML = resultFromRenderer;
    }
};

RowRenderer.prototype.addStylesFromCollDef = function(column, value, node, $childScope, eGridCell) {
    var colDef = column.colDef;
    if (colDef.cellStyle) {
        var cssToUse;
        if (typeof colDef.cellStyle === 'function') {
            var cellStyleParams = {
                value: value,
                data: node.data,
                node: node,
                colDef: colDef,
                column: column,
                $scope: $childScope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            cssToUse = colDef.cellStyle(cellStyleParams);
        } else {
            cssToUse = colDef.cellStyle;
        }

        if (cssToUse) {
            Object.keys(cssToUse).forEach(function(key) {
                eGridCell.style[key] = cssToUse[key];
            });
        }
    }
};

RowRenderer.prototype.addClassesFromCollDef = function(colDef, value, node, $childScope, eGridCell) {
    if (colDef.cellClass) {
        var classToUse;
        if (typeof colDef.cellClass === 'function') {
            var cellClassParams = {
                value: value,
                data: node.data,
                node: node,
                colDef: colDef,
                $scope: $childScope,
                context: this.gridOptionsWrapper.getContext(),
                api: this.gridOptionsWrapper.getApi()
            };
            classToUse = colDef.cellClass(cellClassParams);
        } else {
            classToUse = colDef.cellClass;
        }

        if (typeof classToUse === 'string') {
            utils.addCssClass(eGridCell, classToUse);
        } else if (Array.isArray(classToUse)) {
            classToUse.forEach(function(cssClassItem) {
                utils.addCssClass(eGridCell, cssClassItem);
            });
        }
    }
};

RowRenderer.prototype.addClassesToCell = function(column, node, eGridCell) {
    var classes = ['ag-cell', 'ag-cell-no-focus', 'cell-col-' + column.index];
    if (node.group) {
        if (node.footer) {
            classes.push('ag-footer-cell');
        } else {
            classes.push('ag-group-cell');
        }
    }
    eGridCell.className = classes.join(' ');
};

RowRenderer.prototype.addClassesFromRules = function(colDef, eGridCell, value, node, rowIndex) {
    var classRules = colDef.cellClassRules;
    if (typeof classRules === 'object' && classRules !== null) {

        var params = {
            value: value,
            data: node.data,
            node: node,
            colDef: colDef,
            rowIndex: rowIndex,
            api: this.gridOptionsWrapper.getApi(),
            context: this.gridOptionsWrapper.getContext()
        };

        var classNames = Object.keys(classRules);
        for (var i = 0; i < classNames.length; i++) {
            var className = classNames[i];
            var rule = classRules[className];
            var resultOfRule;
            if (typeof rule === 'string') {
                resultOfRule = this.expressionService.evaluate(rule, params);
            } else if (typeof rule === 'function') {
                resultOfRule = rule(params);
            }
            if (resultOfRule) {
                utils.addCssClass(eGridCell, className);
            } else {
                utils.removeCssClass(eGridCell, className);
            }
        }
    }
};

RowRenderer.prototype.createCell = function(isFirstColumn, column, valueGetter, node, rowIndex, $childScope) {
    var that = this;
    var eGridCell = document.createElement("div");
    eGridCell.setAttribute("col", column.index);

    // only set tab index if cell selection is enabled
    if (!this.gridOptionsWrapper.isSuppressCellSelection()) {
        eGridCell.setAttribute("tabindex", "-1");
    }

    var value;
    if (valueGetter) {
        value = valueGetter();
    }

    // these are the grid styles, don't change between soft refreshes
    this.addClassesToCell(column, node, eGridCell);

    this.populateAndStyleGridCell(valueGetter, value, eGridCell, isFirstColumn, node, column, rowIndex, $childScope);

    this.addCellClickedHandler(eGridCell, node, column, value, rowIndex);
    this.addCellHoverHandler(eGridCell, node, column, value, rowIndex);
    this.addCellDoubleClickedHandler(eGridCell, node, column, value, rowIndex, $childScope, isFirstColumn, valueGetter);

    this.addCellNavigationHandler(eGridCell, rowIndex, column, node);

    eGridCell.style.width = utils.formatWidth(column.actualWidth);

    // add the 'start editing' call to the chain of editors
    this.renderedRowStartEditingListeners[rowIndex][column.colId] = function() {
        if (that.isCellEditable(column.colDef, node)) {
            that.startEditing(eGridCell, column, node, $childScope, rowIndex, isFirstColumn, valueGetter);
            return true;
        } else {
            return false;
        }
    };

    return eGridCell;
};

RowRenderer.prototype.addCellNavigationHandler = function(eGridCell, rowIndex, column, node) {
    var that = this;
    eGridCell.addEventListener('keydown', function(event) {
        if (that.editingCell) {
            return;
        }
        // only interested on key presses that are directly on this element, not any children elements. this
        // stops navigation if the user is in, for example, a text field inside the cell, and user hits
        // on of the keys we are looking for.
        if (event.target !== eGridCell) {
            return;
        }

        var key = event.which || event.keyCode;

        var startNavigation = key === constants.KEY_DOWN || key === constants.KEY_UP
            || key === constants.KEY_LEFT || key === constants.KEY_RIGHT;
        if (startNavigation) {
            event.preventDefault();
            that.navigateToNextCell(key, rowIndex, column);
        }

        var startEdit = key === constants.KEY_ENTER;
        if (startEdit) {
            var startEditingFunc = that.renderedRowStartEditingListeners[rowIndex][column.colId];
            if (startEditingFunc) {
                var editingStarted = startEditingFunc();
                if (editingStarted) {
                    // if we don't prevent default, then the editor that get displayed also picks up the 'enter key'
                    // press, and stops editing immediately, hence giving he user experience that nothing happened
                    event.preventDefault();
                }
            }
        }

        var selectRow = key === constants.KEY_SPACE;
        if (selectRow && that.gridOptionsWrapper.isRowSelection()) {
            var selected = that.selectionController.isNodeSelected(node);
            if (selected) {
                that.selectionController.deselectNode(node);
            } else {
                that.selectionController.selectNode(node, true);
            }
            event.preventDefault();
        }
    });
};

// we use index for rows, but column object for columns, as the next column (by index) might not
// be visible (header grouping) so it's not reliable, so using the column object instead.
RowRenderer.prototype.navigateToNextCell = function(key, rowIndex, column) {

    var cellToFocus = {rowIndex: rowIndex, column: column};
    var renderedRow;
    var eCell;

    // we keep searching for a next cell until we find one. this is how the group rows get skipped
    while (!eCell) {
        cellToFocus = this.getNextCellToFocus(key, cellToFocus);
        // no next cell means we have reached a grid boundary, eg left, right, top or bottom of grid
        if (!cellToFocus) {
            return;
        }
        // see if the next cell is selectable, if yes, use it, if not, skip it
        renderedRow = this.renderedRows[cellToFocus.rowIndex];
        eCell = renderedRow.eCells[cellToFocus.column.colId];
    }

    // this scrolls the row into view
    this.gridPanel.ensureIndexVisible(renderedRow.rowIndex);

    // this changes the css on the cell
    this.focusCell(eCell, cellToFocus.rowIndex, cellToFocus.column.index, true);
};

RowRenderer.prototype.getNextCellToFocus = function(key, lastCellToFocus) {
    var lastRowIndex = lastCellToFocus.rowIndex;
    var lastColumn = lastCellToFocus.column;

    var nextRowToFocus;
    var nextColumnToFocus;
    switch (key) {
        case constants.KEY_UP :
            // if already on top row, do nothing
            if (lastRowIndex === this.firstVirtualRenderedRow) {
                return null;
            }
            nextRowToFocus = lastRowIndex - 1;
            nextColumnToFocus = lastColumn;
            break;
        case constants.KEY_DOWN :
            // if already on bottom, do nothing
            if (lastRowIndex === this.lastVirtualRenderedRow) {
                return null;
            }
            nextRowToFocus = lastRowIndex + 1;
            nextColumnToFocus = lastColumn;
            break;
        case constants.KEY_RIGHT :
            var colToRight = this.columnModel.getVisibleColAfter(lastColumn);
            // if already on right, do nothing
            if (!colToRight) {
                return null;
            }
            nextRowToFocus = lastRowIndex ;
            nextColumnToFocus = colToRight;
            break;
        case constants.KEY_LEFT :
            var colToLeft = this.columnModel.getVisibleColBefore(lastColumn);
            // if already on left, do nothing
            if (!colToLeft) {
                return null;
            }
            nextRowToFocus = lastRowIndex ;
            nextColumnToFocus = colToLeft;
            break;
    }

    return {
        rowIndex: nextRowToFocus,
        column: nextColumnToFocus
    };
};

// called internally
RowRenderer.prototype.focusCell = function(eCell, rowIndex, colIndex, forceBrowserFocus) {
    // do nothing if cell selection is off
    if (this.gridOptionsWrapper.isSuppressCellSelection()) {
        return;
    }

    // remove any previous focus
    utils.querySelectorAll_replaceCssClass(this.eParentOfRows, '.ag-cell-focus', 'ag-cell-focus', 'ag-cell-no-focus');

    var selectorForCell = '[row="' + rowIndex + '"] [col="' + colIndex + '"]';
    utils.querySelectorAll_replaceCssClass(this.eParentOfRows, selectorForCell, 'ag-cell-no-focus', 'ag-cell-focus');

    this.focusedCell = {rowIndex: rowIndex, colIndex: colIndex, node: this.rowModel.getVirtualRow(rowIndex)};

    // this puts the browser focus on the cell (so it gets key presses)
    if (forceBrowserFocus) {
        eCell.focus();
    }

    if (typeof this.gridOptionsWrapper.getCellFocused() === 'function') {
        this.gridOptionsWrapper.getCellFocused()(this.focusedCell);
    }
};

// for API
RowRenderer.prototype.getFocusedCell = function() {
    return this.focusedCell;
};

// called via API
RowRenderer.prototype.setFocusedCell = function(rowIndex, colIndex) {
    var renderedRow = this.renderedRows[rowIndex];
    var column = this.columnModel.getDisplayedColumns()[colIndex];
    if (renderedRow && column) {
        var eCell = renderedRow.eCells[column.colId];
        this.focusCell(eCell, rowIndex, colIndex, true);
    }
};

RowRenderer.prototype.populateAndStyleGridCell = function(valueGetter, value, eGridCell, isFirstColumn, node, column, rowIndex, $childScope) {
    var colDef = column.colDef;

    // populate
    this.populateGridCell(eGridCell, isFirstColumn, node, column, rowIndex, value, valueGetter, $childScope);
    // style
    this.addStylesFromCollDef(column, value, node, $childScope, eGridCell);
    this.addClassesFromCollDef(colDef, value, node, $childScope, eGridCell);
    this.addClassesFromRules(colDef, eGridCell, value, node, rowIndex);
};

RowRenderer.prototype.populateGridCell = function(eGridCell, isFirstColumn, node, column, rowIndex, value, valueGetter, $childScope) {
    var eCellWrapper = document.createElement('span');
    utils.addCssClass(eCellWrapper, "ag-cell-wrapper");
    eGridCell.appendChild(eCellWrapper);

    var colDef = column.colDef;
    if (colDef.checkboxSelection) {
        var eCheckbox = this.selectionRendererFactory.createSelectionCheckbox(node, rowIndex);
        eCellWrapper.appendChild(eCheckbox);
    }

    // eventually we call eSpanWithValue.innerHTML = xxx, so cannot include the checkbox (above) in this span
    var eSpanWithValue = document.createElement("span");
    utils.addCssClass(eSpanWithValue, "ag-cell-value");

    eCellWrapper.appendChild(eSpanWithValue);

    var that = this;
    var refreshCellFunction = function() {
        that.softRefreshCell(eGridCell, isFirstColumn, node, column, $childScope, rowIndex);
    };

    this.putDataIntoCell(column, value, valueGetter, node, $childScope, eSpanWithValue, eGridCell, rowIndex, refreshCellFunction);
};

RowRenderer.prototype.addCellDoubleClickedHandler = function(eGridCell, node, column, value, rowIndex, $childScope, isFirstColumn, valueGetter) {
    var that = this;
    var colDef = column.colDef;
    eGridCell.addEventListener("dblclick", function(event) {
        if (that.gridOptionsWrapper.getCellDoubleClicked()) {
            var paramsForGrid = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            that.gridOptionsWrapper.getCellDoubleClicked()(paramsForGrid);
        }
        if (colDef.cellDoubleClicked) {
            var paramsForColDef = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            colDef.cellDoubleClicked(paramsForColDef);
        }
        if (that.isCellEditable(colDef, node)) {
            that.startEditing(eGridCell, column, node, $childScope, rowIndex, isFirstColumn, valueGetter);
        }
    });
};

RowRenderer.prototype.addCellClickedHandler = function(eGridCell, node, column, value, rowIndex) {
    var colDef = column.colDef;
    var that = this;
    eGridCell.addEventListener("click", function(event) {
        // we pass false to focusCell, as we don't want the cell to focus
        // also get the browser focus. if we did, then the cellRenderer could
        // have a text field in it, for example, and as the user clicks on the
        // text field, the text field, the focus doesn't get to the text
        // field, instead to goes to the div behind, making it impossible to
        // select the text field.
        that.focusCell(eGridCell, rowIndex, column.index, false);
        if (that.gridOptionsWrapper.getCellClicked()) {
            var paramsForGrid = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            that.gridOptionsWrapper.getCellClicked()(paramsForGrid);
        }
        if (colDef.cellClicked) {
            var paramsForColDef = {
                node: node,
                data: node.data,
                value: value,
                rowIndex: rowIndex,
                colDef: colDef,
                event: event,
                eventSource: this,
                api: that.gridOptionsWrapper.getApi()
            };
            colDef.cellClicked(paramsForColDef);
        }
    });
};

RowRenderer.prototype.addCellHoverHandler = function(eGridCell, node, column, value, rowIndex) {
    var that = this;
    var colDef = column.colDef;
    var hoverHandler = colDef.cellHoverHandler;

    if (hoverHandler) {
        eGridCell.addEventListener("mouseenter", function(e) {
            var hoverParams = {
                colDef: colDef,
                event: e,
                entering: true,
                leaving: false,
                rowIndex: rowIndex,
                value: value,
                context: that.gridOptionsWrapper.getContext(),
                api: that.gridOptionsWrapper.getApi()
            };
            hoverHandler(hoverParams);
        });
        eGridCell.addEventListener("mouseleave", function(e) {
            var hoverParams = {
                colDef: colDef,
                event: e,
                entering: false,
                leaving: true,
                rowIndex: rowIndex,
                value: value,
                context: that.gridOptionsWrapper.getContext(),
                api: that.gridOptionsWrapper.getApi()
            };
            hoverHandler(hoverParams);
        });
    }
};

RowRenderer.prototype.isCellEditable = function(colDef, node) {
    if (this.editingCell) {
        return false;
    }

    // never allow editing of groups
    if (node.group) {
        return false;
    }

    // if boolean set, then just use it
    if (typeof colDef.editable === 'boolean') {
        return colDef.editable;
    }

    // if function, then call the function to find out
    if (typeof colDef.editable === 'function') {
        // should change this, so it gets passed params with nice useful values
        return colDef.editable(node.data);
    }

    return false;
};

RowRenderer.prototype.stopEditing = function(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter) {
    this.editingCell = false;
    var newValue = eInput.value;
    var colDef = column.colDef;

    //If we don't remove the blur listener first, we get:
    //Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is no longer a child of this node. Perhaps it was moved in a 'blur' event handler?
    eInput.removeEventListener('blur', blurListener);

    utils.removeAllChildren(eGridCell);

    var paramsForCallbacks = {
        node: node,
        data: node.data,
        oldValue: node.data[colDef.field],
        newValue: newValue,
        rowIndex: rowIndex,
        colDef: colDef,
        api: this.gridOptionsWrapper.getApi(),
        context: this.gridOptionsWrapper.getContext()
    };

    if (colDef.newValueHandler) {
        colDef.newValueHandler(paramsForCallbacks);
    } else {
        node.data[colDef.field] = newValue;
    }

    // at this point, the value has been updated
    var newValue;
    if (valueGetter) {
        newValue = valueGetter();
    }
    paramsForCallbacks.newValue = newValue;
    if (typeof colDef.cellValueChanged === 'function') {
        colDef.cellValueChanged(paramsForCallbacks);
    }
    if (typeof this.gridOptionsWrapper.getCellValueChanged() === 'function') {
        this.gridOptionsWrapper.getCellValueChanged()(paramsForCallbacks);
    }

    this.populateAndStyleGridCell(valueGetter, newValue, eGridCell, isFirstColumn, node, column, rowIndex, $childScope);
};

RowRenderer.prototype.useEditCellRenderer = function(column, node, $childScope, rowIndex, valueGetter) {
    var colDef = column.colDef;
    var rendererParams = {
        value: valueGetter(),
        valueGetter: valueGetter,
        data: node.data,
        node: node,
        colDef: colDef,
        column: column,
        $scope: $childScope,
        rowIndex: rowIndex,
        api: this.gridOptionsWrapper.getApi(),
        context: this.gridOptionsWrapper.getContext(),
    };

    var editRenderer = colDef.editCellRenderer;
    var resultFromRenderer = editRenderer(rendererParams);

    return resultFromRenderer;
};

RowRenderer.prototype.startEditing = function(eGridCell, column, node, $childScope, rowIndex, isFirstColumn, valueGetter) {
    var that = this;
    this.editingCell = true;
    utils.removeAllChildren(eGridCell);
    var eInput, nodeToAppend;

    if (column.colDef.editCellRenderer) {
        nodeToAppend = document.createElement('span');
        var editCell = this.useEditCellRenderer(column, node, $childScope, rowIndex, valueGetter);
        if (utils.isNodeOrElement(editCell)) {
            nodeToAppend.appendChild(editCell)
        } else {
            nodeToAppend.innerHTML = editCell;
        }
        eInput = nodeToAppend.querySelector('input');
    } else {
        eInput = document.createElement('input');
        eInput.type = 'text';
        nodeToAppend = eInput;
        utils.addCssClass(eInput, 'ag-cell-edit-input');

        if (valueGetter) {
            var value = valueGetter();
            if (value !== null && value !== undefined) {
                eInput.value = value;
            }
        }

        eInput.style.width = (column.actualWidth - 14) + 'px';
    }

    eGridCell.appendChild(nodeToAppend);
    eInput.focus();
    eInput.select();

    var blurListener = function() {
        that.stopEditing(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter);
    };

    //stop entering if we loose focus
    eInput.addEventListener("blur", blurListener);

    //stop editing if enter pressed
    eInput.addEventListener('keypress', function(event) {
        var key = event.which || event.keyCode;
        // 13 is enter
        if (key == constants.KEY_ENTER) {
            that.stopEditing(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter);
            that.focusCell(eGridCell, rowIndex, column.index, true);
        }
    });

    // tab key doesn't generate keypress, so need keydown to listen for that
    eInput.addEventListener('keydown', function(event) {
        var key = event.which || event.keyCode;
        if (key == constants.KEY_TAB) {
            that.stopEditing(eGridCell, column, node, $childScope, eInput, blurListener, rowIndex, isFirstColumn, valueGetter);
            that.startEditingNextCell(rowIndex, column, event.shiftKey);
            // we don't want the default tab action, so return false, this stops the event from bubbling
            event.preventDefault();
            return false;
        }
    });
};

RowRenderer.prototype.startEditingNextCell = function(rowIndex, column, shiftKey) {

    var firstRowToCheck = this.firstVirtualRenderedRow;
    var lastRowToCheck = this.lastVirtualRenderedRow;
    var currentRowIndex = rowIndex;

    var visibleColumns = this.columnModel.getDisplayedColumns();
    var currentCol = column;

    while (true) {

        var indexOfCurrentCol = visibleColumns.indexOf(currentCol);

        // move backward
        if (shiftKey) {
            // move along to the previous cell
            currentCol = visibleColumns[indexOfCurrentCol - 1];
            // check if end of the row, and if so, go back a row
            if (!currentCol) {
                currentCol = visibleColumns[visibleColumns.length - 1];
                currentRowIndex--;
            }

            // if got to end of rendered rows, then quit looking
            if (currentRowIndex < firstRowToCheck) {
                return;
            }
            // move forward
        } else {
            // move along to the next cell
            currentCol = visibleColumns[indexOfCurrentCol + 1];
            // check if end of the row, and if so, go forward a row
            if (!currentCol) {
                currentCol = visibleColumns[0];
                currentRowIndex++;
            }

            // if got to end of rendered rows, then quit looking
            if (currentRowIndex > lastRowToCheck) {
                return;
            }
        }

        var nextFunc = this.renderedRowStartEditingListeners[currentRowIndex][currentCol.colId];
        if (nextFunc) {
            // see if the next cell is editable, and if so, we have come to
            // the end of our search, so stop looking for the next cell
            var nextCellAcceptedEdit = nextFunc();
            if (nextCellAcceptedEdit) {
                return;
            }
        }
    }

};

module.exports = RowRenderer;

},{"./cellRenderers/groupCellRendererFactory":2,"./constants":4,"./utils":38}],31:[function(require,module,exports){
var utils = require('./utils');

// these constants are used for determining if groups should
// be selected or deselected when selecting groups, and the group
// then selects the children.
var SELECTED = 0;
var UNSELECTED = 1;
var MIXED = 2;
var DO_NOT_CARE = 3;

function SelectionController() {}

SelectionController.prototype.init = function(angularGrid, gridPanel, gridOptionsWrapper, $scope, rowRenderer) {
    this.eRowsParent = gridPanel.getRowsParent();
    this.angularGrid = angularGrid;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.$scope = $scope;
    this.rowRenderer = rowRenderer;
    this.gridOptionsWrapper = gridOptionsWrapper;

    this.initSelectedNodesById();

    this.selectedRows = [];
    gridOptionsWrapper.setSelectedRows(this.selectedRows);
};

SelectionController.prototype.initSelectedNodesById = function() {
    this.selectedNodesById = {};
    this.gridOptionsWrapper.setSelectedNodesById(this.selectedNodesById);
};

SelectionController.prototype.getSelectedNodes = function() {
    var selectedNodes = [];
    var keys = Object.keys(this.selectedNodesById);
    for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        var selectedNode = this.selectedNodesById[id];
        selectedNodes.push(selectedNode);
    }
    return selectedNodes;
};

// returns a list of all nodes at 'best cost' - a feature to be used
// with groups / trees. if a group has all it's children selected,
// then the group appears in the result, but not the children.
// Designed for use with 'children' as the group selection type,
// where groups don't actually appear in the selection normally.
SelectionController.prototype.getBestCostNodeSelection = function() {

    if (typeof this.rowModel.getTopLevelNodes !== 'function') {
        throw 'selectAll not available when rows are on the server';
    }

    var topLevelNodes = this.rowModel.getTopLevelNodes();

    var result = [];
    var that = this;

    // recursive function, to find the selected nodes
    function traverse(nodes) {
        for (var i = 0, l = nodes.length; i < l; i++) {
            var node = nodes[i];
            if (that.isNodeSelected(node)) {
                result.push(node);
            } else {
                // if not selected, then if it's a group, and the group
                // has children, continue to search for selections
                if (node.group && node.children) {
                    traverse(node.children);
                }
            }
        }
    }

    traverse(topLevelNodes);

    return result;
};

SelectionController.prototype.setRowModel = function(rowModel) {
    this.rowModel = rowModel;
};

// public - this clears the selection, but doesn't clear down the css - when it is called, the
// caller then gets the grid to refresh.
SelectionController.prototype.deselectAll = function() {
    this.initSelectedNodesById();
    //var keys = Object.keys(this.selectedNodesById);
    //for (var i = 0; i < keys.length; i++) {
    //    delete this.selectedNodesById[keys[i]];
    //}
    this.syncSelectedRowsAndCallListener();
};

// public - this selects everything, but doesn't clear down the css - when it is called, the
// caller then gets the grid to refresh.
SelectionController.prototype.selectAll = function() {

    if (typeof this.rowModel.getTopLevelNodes !== 'function') {
        throw 'selectAll not available when rows are on the server';
    }

    var selectedNodesById = this.selectedNodesById;
    // if the selection is "don't include groups", then we don't include them!
    var includeGroups = !this.gridOptionsWrapper.isGroupSelectsChildren();

    function recursivelySelect(nodes) {
        if (nodes) {
            for (var i = 0; i<nodes.length; i++) {
                var node = nodes[i];
                if (node.group) {
                    recursivelySelect(node.children);
                    if (includeGroups) {
                        selectedNodesById[node.id] = node;
                    }
                } else {
                    selectedNodesById[node.id] = node;
                }
            }
        }
    }

    var topLevelNodes = this.rowModel.getTopLevelNodes();
    recursivelySelect(topLevelNodes);

    this.syncSelectedRowsAndCallListener();
};

// public
SelectionController.prototype.selectNode = function(node, tryMulti, suppressEvents) {
    var multiSelect = this.gridOptionsWrapper.isRowSelectionMulti() && tryMulti;

    // if the node is a group, then selecting this is the same as selecting the parent,
    // so to have only one flow through the below, we always select the header parent
    // (which then has the side effect of selecting the child).
    var nodeToSelect;
    if (node.footer) {
        nodeToSelect = node.sibling;
    } else {
        nodeToSelect = node;
    }

    // at the end, if this is true, we inform the callback
    var atLeastOneItemUnselected = false;
    var atLeastOneItemSelected = false;

    // see if rows to be deselected
    if (!multiSelect) {
        atLeastOneItemUnselected = this.doWorkOfDeselectAllNodes();
    }

    if (this.gridOptionsWrapper.isGroupSelectsChildren() && nodeToSelect.group) {
        // don't select the group, select the children instead
        atLeastOneItemSelected = this.recursivelySelectAllChildren(nodeToSelect);
    } else {
        // see if row needs to be selected
        atLeastOneItemSelected = this.doWorkOfSelectNode(nodeToSelect, suppressEvents);
    }

    if (atLeastOneItemUnselected || atLeastOneItemSelected) {
        this.syncSelectedRowsAndCallListener(suppressEvents);
    }

    this.updateGroupParentsIfNeeded();
};

SelectionController.prototype.recursivelySelectAllChildren = function(node, suppressEvents) {
    var atLeastOne = false;
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.group) {
                if (this.recursivelySelectAllChildren(child)) {
                    atLeastOne = true;
                }
            } else {
                if (this.doWorkOfSelectNode(child, suppressEvents)) {
                    atLeastOne = true;
                }
            }
        }
    }
    return atLeastOne;
};

SelectionController.prototype.recursivelyDeselectAllChildren = function(node) {
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.group) {
                this.recursivelyDeselectAllChildren(child);
            } else {
                this.deselectRealNode(child);
            }
        }
    }
};

// private
// 1 - selects a node
// 2 - updates the UI
// 3 - calls callbacks
SelectionController.prototype.doWorkOfSelectNode = function(node, suppressEvents) {
    if (this.selectedNodesById[node.id]) {
        return false;
    }

    this.selectedNodesById[node.id] = node;

    this.addCssClassForNode_andInformVirtualRowListener(node);

    // also color in the footer if there is one
    if (node.group && node.expanded && node.sibling) {
        this.addCssClassForNode_andInformVirtualRowListener(node.sibling);
    }

    // inform the rowSelected listener, if any
    if (!suppressEvents && typeof this.gridOptionsWrapper.getRowSelected() === "function") {
        this.gridOptionsWrapper.getRowSelected()(node.data, node);
    }

    return true;
};

// private
// 1 - selects a node
// 2 - updates the UI
// 3 - calls callbacks
// wow - what a big name for a method, exception case, it's saying what the method does
SelectionController.prototype.addCssClassForNode_andInformVirtualRowListener = function(node) {
    var virtualRenderedRowIndex = this.rowRenderer.getIndexOfRenderedNode(node);
    if (virtualRenderedRowIndex >= 0) {
        utils.querySelectorAll_addCssClass(this.eRowsParent, '[row="' + virtualRenderedRowIndex + '"]', 'ag-row-selected');

        // inform virtual row listener
        this.angularGrid.onVirtualRowSelected(virtualRenderedRowIndex, true);
    }
};

// private
// 1 - un-selects a node
// 2 - updates the UI
// 3 - calls callbacks
SelectionController.prototype.doWorkOfDeselectAllNodes = function(nodeToKeepSelected) {
    // not doing multi-select, so deselect everything other than the 'just selected' row
    var atLeastOneSelectionChange;
    var selectedNodeKeys = Object.keys(this.selectedNodesById);
    for (var i = 0; i < selectedNodeKeys.length; i++) {
        // skip the 'just selected' row
        var key = selectedNodeKeys[i];
        var nodeToDeselect = this.selectedNodesById[key];
        if (nodeToDeselect === nodeToKeepSelected) {
            continue;
        } else {
            this.deselectRealNode(nodeToDeselect);
            atLeastOneSelectionChange = true;
        }
    }
    return atLeastOneSelectionChange;
};

// private
SelectionController.prototype.deselectRealNode = function(node) {
    // deselect the css
    this.removeCssClassForNode(node);

    // if node is a header, and if it has a sibling footer, deselect the footer also
    if (node.group && node.expanded && node.sibling) { // also check that it's expanded, as sibling could be a ghost
        this.removeCssClassForNode(node.sibling);
    }

    // remove the row
    delete this.selectedNodesById[node.id];
};

// private
SelectionController.prototype.removeCssClassForNode = function(node) {
    var virtualRenderedRowIndex = this.rowRenderer.getIndexOfRenderedNode(node);
    if (virtualRenderedRowIndex >= 0) {
        utils.querySelectorAll_removeCssClass(this.eRowsParent, '[row="' + virtualRenderedRowIndex + '"]', 'ag-row-selected');
        // inform virtual row listener
        this.angularGrid.onVirtualRowSelected(virtualRenderedRowIndex, false);
    }
};

// public (selectionRendererFactory)
SelectionController.prototype.deselectIndex = function(rowIndex) {
    var node = this.rowModel.getVirtualRow(rowIndex);
    this.deselectNode(node);
};

// public (api)
SelectionController.prototype.deselectNode = function(node) {
    if (node) {
        if (this.gridOptionsWrapper.isGroupSelectsChildren() && node.group) {
            // want to deselect children, not this node, so recursively deselect
            this.recursivelyDeselectAllChildren(node);
        } else {
            this.deselectRealNode(node);
        }
    }
    this.syncSelectedRowsAndCallListener();
    this.updateGroupParentsIfNeeded();
};

// public (selectionRendererFactory & api)
SelectionController.prototype.selectIndex = function(index, tryMulti, suppressEvents) {
    var node = this.rowModel.getVirtualRow(index);
    this.selectNode(node, tryMulti, suppressEvents);
};

// private
// updates the selectedRows with the selectedNodes and calls selectionChanged listener
SelectionController.prototype.syncSelectedRowsAndCallListener = function(suppressEvents) {
    // update selected rows
    var selectedRows = this.selectedRows;
    var oldCount = selectedRows.length;
    // clear selected rows
    selectedRows.length = 0;
    var keys = Object.keys(this.selectedNodesById);
    for (var i = 0; i < keys.length; i++) {
        if (this.selectedNodesById[keys[i]] !== undefined) {
            var selectedNode = this.selectedNodesById[keys[i]];
            selectedRows.push(selectedNode.data);
        }
    }

    // this stope the event firing the very first the time grid is initialised. without this, the documentation
    // page had a popup in the 'selection' page as soon as the page was loaded!!
    var nothingChangedMustBeInitialising = oldCount === 0 && selectedRows.length === 0;

    if (!nothingChangedMustBeInitialising && !suppressEvents && typeof this.gridOptionsWrapper.getSelectionChanged() === "function") {
        this.gridOptionsWrapper.getSelectionChanged()();
    }

    var that = this;
    if (this.$scope) {
        setTimeout(function() {
            that.$scope.$apply();
        }, 0);
    }
};

// private
SelectionController.prototype.recursivelyCheckIfSelected = function(node) {
    var foundSelected = false;
    var foundUnselected = false;

    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            var result;
            if (child.group) {
                result = this.recursivelyCheckIfSelected(child);
                switch (result) {
                    case SELECTED:
                        foundSelected = true;
                        break;
                    case UNSELECTED:
                        foundUnselected = true;
                        break;
                    case MIXED:
                        foundSelected = true;
                        foundUnselected = true;
                        break;
                        // we can ignore the DO_NOT_CARE, as it doesn't impact, means the child
                        // has no children and shouldn't be considered when deciding
                }
            } else {
                if (this.isNodeSelected(child)) {
                    foundSelected = true;
                } else {
                    foundUnselected = true;
                }
            }

            if (foundSelected && foundUnselected) {
                // if mixed, then no need to go further, just return up the chain
                return MIXED;
            }
        }
    }

    // got this far, so no conflicts, either all children selected, unselected, or neither
    if (foundSelected) {
        return SELECTED;
    } else if (foundUnselected) {
        return UNSELECTED;
    } else {
        return DO_NOT_CARE;
    }
};

// public (selectionRendererFactory)
// returns:
// true: if selected
// false: if unselected
// undefined: if it's a group and 'children selection' is used and 'children' are a mix of selected and unselected
SelectionController.prototype.isNodeSelected = function(node) {
    if (this.gridOptionsWrapper.isGroupSelectsChildren() && node.group) {
        // doing child selection, we need to traverse the children
        var resultOfChildren = this.recursivelyCheckIfSelected(node);
        switch (resultOfChildren) {
            case SELECTED:
                return true;
            case UNSELECTED:
                return false;
            default:
                return undefined;
        }
    } else {
        return this.selectedNodesById[node.id] !== undefined;
    }
};

SelectionController.prototype.updateGroupParentsIfNeeded = function() {
    // we only do this if parent nodes are responsible
    // for selecting their children.
    if (!this.gridOptionsWrapper.isGroupSelectsChildren()) {
        return;
    }

    var firstRow = this.rowRenderer.getFirstVirtualRenderedRow();
    var lastRow = this.rowRenderer.getLastVirtualRenderedRow();
    for (var rowIndex = firstRow; rowIndex <= lastRow; rowIndex++) {
        // see if node is a group
        var node = this.rowModel.getVirtualRow(rowIndex);
        if (node.group) {
            var selected = this.isNodeSelected(node);
            this.angularGrid.onVirtualRowSelected(rowIndex, selected);

            if (selected) {
                utils.querySelectorAll_addCssClass(this.eRowsParent, '[row="' + rowIndex + '"]', 'ag-row-selected');
            } else {
                utils.querySelectorAll_removeCssClass(this.eRowsParent, '[row="' + rowIndex + '"]', 'ag-row-selected');
            }
        }
    }
};

module.exports = SelectionController;

},{"./utils":38}],32:[function(require,module,exports){
function SelectionRendererFactory() {}

SelectionRendererFactory.prototype.init = function(angularGrid, selectionController) {
    this.angularGrid = angularGrid;
    this.selectionController = selectionController;
};

SelectionRendererFactory.prototype.createCheckboxColDef = function() {
    return {
        width: 30,
        suppressMenu: true,
        suppressSorting: true,
        headerCellRenderer: function() {
            var eCheckbox = document.createElement('input');
            eCheckbox.type = 'checkbox';
            eCheckbox.name = 'name';
            return eCheckbox;
        },
        cellRenderer: this.createCheckboxRenderer()
    };
};

SelectionRendererFactory.prototype.createCheckboxRenderer = function() {
    var that = this;
    return function(params) {
        return that.createSelectionCheckbox(params.node, params.rowIndex);
    };
};

SelectionRendererFactory.prototype.createSelectionCheckbox = function(node, rowIndex) {

    var eCheckbox = document.createElement('input');
    eCheckbox.type = "checkbox";
    eCheckbox.name = "name";
    eCheckbox.className = 'ag-selection-checkbox';
    setCheckboxState(eCheckbox, this.selectionController.isNodeSelected(node));

    var that = this;
    eCheckbox.onclick = function(event) {
        event.stopPropagation();
    };

    eCheckbox.onchange = function() {
        var newValue = eCheckbox.checked;
        if (newValue) {
            that.selectionController.selectIndex(rowIndex, true);
        } else {
            that.selectionController.deselectIndex(rowIndex);
        }
    };

    this.angularGrid.addVirtualRowListener(rowIndex, {
        rowSelected: function(selected) {
            setCheckboxState(eCheckbox, selected);
        },
        rowRemoved: function() {}
    });

    return eCheckbox;
};

function setCheckboxState(eCheckbox, state) {
    if (typeof state === 'boolean') {
        eCheckbox.checked = state;
        eCheckbox.indeterminate = false;
    } else {
        // isNodeSelected returns back undefined if it's a group and the children
        // are a mix of selected and unselected
        eCheckbox.indeterminate = true;
    }
}

module.exports = SelectionRendererFactory;

},{}],33:[function(require,module,exports){
var SVG_NS = "http://www.w3.org/2000/svg";

function SvgFactory() {}

SvgFactory.prototype.createFilterSvg = function() {
    var eSvg = createIconSvg();

    var eFunnel = document.createElementNS(SVG_NS, "polygon");
    eFunnel.setAttribute("points", "0,0 4,4 4,10 6,10 6,4 10,0");
    eFunnel.setAttribute("class", "ag-header-icon");
    eSvg.appendChild(eFunnel);

    return eSvg;
};

SvgFactory.prototype.createColumnShowingSvg = function() {
    return createCircle(true);
};

SvgFactory.prototype.createColumnHiddenSvg = function() {
    return createCircle(false);
};

SvgFactory.prototype.createMenuSvg = function() {
    var eSvg = document.createElementNS(SVG_NS, "svg");
    var size = "12";
    eSvg.setAttribute("width", size);
    eSvg.setAttribute("height", size);

    ["0", "5", "10"].forEach(function(y) {
        var eLine = document.createElementNS(SVG_NS, "rect");
        eLine.setAttribute("y", y);
        eLine.setAttribute("width", size);
        eLine.setAttribute("height", "2");
        eLine.setAttribute("class", "ag-header-icon");
        eSvg.appendChild(eLine);
    });

    return eSvg;
};

SvgFactory.prototype.createArrowUpSvg = function() {
    return createPolygonSvg("0,10 5,0 10,10");
};

SvgFactory.prototype.createArrowLeftSvg = function() {
    return createPolygonSvg("10,0 0,5 10,10");
};

SvgFactory.prototype.createArrowDownSvg = function() {
    return createPolygonSvg("0,0 5,10 10,0");
};

SvgFactory.prototype.createArrowRightSvg = function() {
    return createPolygonSvg("0,0 10,5 0,10");
};

function createPolygonSvg(points) {
    var eSvg = createIconSvg();

    var eDescIcon = document.createElementNS(SVG_NS, "polygon");
    eDescIcon.setAttribute("points", points);
    eSvg.appendChild(eDescIcon);

    return eSvg;
}

// util function for the above
function createIconSvg() {
    var eSvg = document.createElementNS(SVG_NS, "svg");
    eSvg.setAttribute("width", "10");
    eSvg.setAttribute("height", "10");
    return eSvg;
}

function createCircle(fill) {
    var eSvg = createIconSvg();

    var eCircle = document.createElementNS(SVG_NS, "circle");
    eCircle.setAttribute("cx", "5");
    eCircle.setAttribute("cy", "5");
    eCircle.setAttribute("r", "5");
    eCircle.setAttribute("stroke", "black");
    eCircle.setAttribute("stroke-width", "2");
    if (fill) {
        eCircle.setAttribute("fill", "black");
    } else {
        eCircle.setAttribute("fill", "none");
    }
    eSvg.appendChild(eCircle);

    return eSvg;
};

module.exports = SvgFactory;

},{}],34:[function(require,module,exports){

function TemplateService() {
    this.templateCache = {};
    this.waitingCallbacks = {};
}

TemplateService.prototype.init = function ($scope) {
    this.$scope = $scope;
};

// returns the template if it is loaded, or null if it is not loaded
// but will call the callback when it is loaded
TemplateService.prototype.getTemplate = function (url, callback) {

    var templateFromCache = this.templateCache[url];
    if (templateFromCache) {
        return templateFromCache;
    }

    var callbackList = this.waitingCallbacks[url];
    var that = this;
    if (!callbackList) {
        // first time this was called, so need a new list for callbacks
        callbackList = [];
        this.waitingCallbacks[url] = callbackList;
        // and also need to do the http request
        var client = new XMLHttpRequest();
        client.onload = function () { that.handleHttpResult(this, url); };
        client.open("GET", url);
        client.send();
    }

    // add this callback
    if (callback) {
        callbackList.push(callback);
    }

    // caller needs to wait for template to load, so return null
    return null;
};

TemplateService.prototype.handleHttpResult = function (httpResult, url) {

    if (httpResult.status !== 200 || httpResult.response === null) {
        console.warn('Unable to get template error ' + httpResult.status + ' - ' + url);
        return;
    }

    // response success, so process it
    this.templateCache[url] = httpResult.response;

    // inform all listeners that this is now in the cache
    var callbacks = this.waitingCallbacks[url];
    for (var i = 0; i < callbacks.length; i++) {
        var callback = callbacks[i];
        // we could pass the callback the response, however we know the client of this code
        // is the cell renderer, and it passes the 'cellRefresh' method in as the callback
        // which doesn't take any parameters.
        callback();
    }

    if (this.$scope) {
        var that = this;
        setTimeout(function() {
            that.$scope.$apply();
        }, 0);
    }
};

module.exports = TemplateService;

},{}],35:[function(require,module,exports){
var CheckboxSelection = require("../widgets/checkboxSelection");
var utils = require('./../utils');
var BorderLayout = require('../layout/BorderLayout');
var SvgFactory = require('../svgFactory');

var svgFactory = new SvgFactory();

function ColumnSelectionPanel(columnController, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.setupComponents();
    this.columnController = columnController;

    var that = this;
    this.columnController.addListener({
        columnsChanged: that.columnsChanged.bind(that)
    });
}

ColumnSelectionPanel.prototype.columnsChanged = function(newColumns) {
    this.cColumnList.setModel(newColumns);
};

ColumnSelectionPanel.prototype.getColumnList = function() {
    return this.cColumnList;
};

ColumnSelectionPanel.prototype.columnCellRenderer = function(params) {
    var column = params.value;
    var colDisplayName = this.columnController.getDisplayNameForCol(column);

    var eResult = document.createElement('span');

    var eVisibleIcons = document.createElement('span');
    utils.addCssClass(eVisibleIcons, 'ag-visible-icons');
    var eShowing = utils.createIcon('columnVisible', this.gridOptionsWrapper, column, svgFactory.createColumnShowingSvg);
    var eHidden = utils.createIcon('columnHidden', this.gridOptionsWrapper, column, svgFactory.createColumnHiddenSvg);
    eVisibleIcons.appendChild(eShowing);
    eVisibleIcons.appendChild(eHidden);
    eShowing.style.display = column.visible ? '' : 'none';
    eHidden.style.display = column.visible ? 'none' : '';
    eResult.appendChild(eVisibleIcons);

    var eValue = document.createElement('span');
    eValue.innerHTML = colDisplayName;
    eResult.appendChild(eValue);

    if (!column.visible) {
        utils.addCssClass(eResult, 'ag-column-not-visible');
    }

    // change visible if use clicks the visible icon, or if row is double clicked
    eVisibleIcons.addEventListener('click', showEventListener);

    var that = this;
    function showEventListener() {
        column.visible = !column.visible;
        that.cColumnList.refreshView();
        that.columnController.onColumnStateChanged();
    }

    return eResult;
};

ColumnSelectionPanel.prototype.setupComponents = function() {

    this.cColumnList = new CheckboxSelection();
    this.cColumnList.setCellRenderer(this.columnCellRenderer.bind(this));

    var that = this;
    this.cColumnList.addModelChangedListener( function() {
        that.columnController.onColumnStateChanged();
    });

    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    var columnsLocalText = localeTextFunc('columns', 'Columns');

    var eNorthPanel = document.createElement('div');
    eNorthPanel.innerHTML = '<div style="text-align: center;">'+columnsLocalText+'</div>';

    this.layout = new BorderLayout({
        center: this.cColumnList.getGui(),
        north: eNorthPanel
    });
};

// not sure if this is called anywhere
ColumnSelectionPanel.prototype.setSelected = function(column, selected) {
    column.visible = selected;
    this.columnController.onColumnStateChanged();
};

ColumnSelectionPanel.prototype.getGui = function() {
    return this.eRootPanel.getGui();
};

module.exports = ColumnSelectionPanel;

},{"../layout/BorderLayout":23,"../svgFactory":33,"../widgets/checkboxSelection":40,"./../utils":38}],36:[function(require,module,exports){
var CheckboxSelection = require("../widgets/checkboxSelection");
var constants = require('../constants');
var utils = require('../utils');
var BorderLayout = require('../layout/borderLayout');
var SvgFactory = require('../svgFactory');

var svgFactory = new SvgFactory();

function GroupSelectionPanel(columnController, inMemoryRowController, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.setupComponents();
    this.columnController = columnController;
    this.inMemoryRowController = inMemoryRowController;

    var that = this;
    this.columnController.addListener({
        columnsChanged: that.columnsChanged.bind(that)
    });
}

GroupSelectionPanel.prototype.columnsChanged = function(newColumns, newGroupedColumns) {
    this.cColumnList.setModel(newGroupedColumns);
};

GroupSelectionPanel.prototype.getColumnList = function() {
    return this.cColumnList;
};

GroupSelectionPanel.prototype.columnCellRenderer = function(params) {
    var column = params.value;
    var colDisplayName = this.columnController.getDisplayNameForCol(column);

    var eResult = document.createElement('span');

    var eRemove = utils.createIcon('columnRemoveFromGroupIcon', this.gridOptionsWrapper, column, svgFactory.createArrowUpSvg);
    utils.addCssClass(eRemove, 'ag-visible-icons');
    eResult.appendChild(eRemove);

    var that = this;
    eRemove.addEventListener('click', function () {
        var model = that.cColumnList.getModel();
        model.splice(model.indexOf(column), 1);
        that.cColumnList.setModel(model);
        that.onGroupingChanged();
    });

    var eValue = document.createElement('span');
    eValue.innerHTML = colDisplayName;
    eResult.appendChild(eValue);

    return eResult;
};

GroupSelectionPanel.prototype.setupComponents = function() {
    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    var columnsLocalText = localeTextFunc('pivotedColumns', 'Pivoted Columns');
    var pivotedColumnsEmptyMessage = localeTextFunc('pivotedColumnsEmptyMessage', 'Drag columns down from above to pivot by those columns');

    this.cColumnList = new CheckboxSelection();
    this.cColumnList.setCellRenderer(this.columnCellRenderer.bind(this));
    this.cColumnList.addModelChangedListener(this.onGroupingChanged.bind(this));
    this.cColumnList.setEmptyMessage(pivotedColumnsEmptyMessage);

    var eNorthPanel = document.createElement('div');
    eNorthPanel.style.paddingTop = '10px';
    eNorthPanel.innerHTML = '<div style="text-align: center;">'+columnsLocalText+'</div>';

    this.layout = new BorderLayout({
        center: this.cColumnList.getGui(),
        north: eNorthPanel
    });
};

GroupSelectionPanel.prototype.onGroupingChanged = function() {
    this.inMemoryRowController.doGrouping();
    this.inMemoryRowController.updateModel(constants.STEP_EVERYTHING);
    this.columnController.onColumnStateChanged();
};

GroupSelectionPanel.prototype.getGui = function() {
    return this.eRootPanel.getGui();
};

module.exports = GroupSelectionPanel;
},{"../constants":4,"../layout/borderLayout":24,"../svgFactory":33,"../utils":38,"../widgets/checkboxSelection":40}],37:[function(require,module,exports){
var utils = require('../utils');
var ColumnSelectionPanel = require('./columnSelectionPanel');
var GroupSelectionPanel = require('./groupSelectionPanel');
var VerticalStack = require('../layout/verticalStack');

function ToolPanel() {
    this.layout = new VerticalStack();
}

ToolPanel.prototype.init = function(columnController, inMemoryRowController, gridOptionsWrapper) {

    var columnSelectionPanel = new ColumnSelectionPanel(columnController, gridOptionsWrapper);
    this.layout.addPanel(columnSelectionPanel.layout, '50%');
    var groupSelectionPanel = new GroupSelectionPanel(columnController, inMemoryRowController, gridOptionsWrapper);
    this.layout.addPanel(groupSelectionPanel.layout, '50%');

    groupSelectionPanel.getColumnList().addDragSource(columnSelectionPanel.getColumnList().getUniqueId());

    var eGui = this.layout.getGui();

    utils.addCssClass(eGui, 'ag-tool-panel-container');
};

module.exports = ToolPanel;

},{"../layout/verticalStack":25,"../utils":38,"./columnSelectionPanel":35,"./groupSelectionPanel":36}],38:[function(require,module,exports){
function Utils() {}

var FUNCTION_STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var FUNCTION_ARGUMENT_NAMES = /([^\s,]+)/g;

Utils.prototype.iterateObject = function(object, callback) {
    var keys = Object.keys(object);
    for (var i = 0; i<keys.length; i++) {
        var key = keys[i];
        var value = object[key];
        callback(key, value);
    }
};

Utils.prototype.map = function(array, callback) {
    var result = [];
    for (var i = 0; i<array.length; i++) {
        var item = array[i];
        var mappedItem = callback(item);
        result.push(mappedItem);
    }
    return result;
};

Utils.prototype.getFunctionParameters = function(func) {
    var fnStr = func.toString().replace(FUNCTION_STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(FUNCTION_ARGUMENT_NAMES);
    if (result === null) {
        return [];
    } else {
        return result;
    }
};

Utils.prototype.toStrings = function(array) {
    return this.map(array, function (item) {
        if (item === undefined || item === null || !item.toString) {
            return null;
        } else {
            return item.toString();
        }
    });
};

/*
Utils.prototype.objectValuesToArray = function(object) {
    var keys = Object.keys(object);
    var result = [];
    for (var i = 0; i<keys.length; i++) {
        var key = keys[i];
        var value = object[key];
        result.push(value);
    }
    return result;
};
*/

Utils.prototype.iterateArray = function(array, callback) {
    for (var index = 0; index<array.length; index++) {
        var value = array[index];
        callback(value, index);
    }
};

Utils.prototype.getValue = function(expressionService, data, colDef, node, api, context) {

    var valueGetter = colDef.valueGetter;
    var field = colDef.field;

    // if there is a value getter, this gets precedence over a field
    if (valueGetter) {

        var params = {
            data: data,
            node: node,
            colDef: colDef,
            api: api,
            context: context
        };

        if (typeof valueGetter === 'function') {
            // valueGetter is a function, so just call it
            return valueGetter(params);
        } else if (typeof valueGetter === 'string') {
            // valueGetter is an expression, so execute the expression
            return expressionService.evaluate(valueGetter, params);
        }

    } else if (field && data) {
        return data[field];
    } else {
        return undefined;
    }
};

//Returns true if it is a DOM node
//taken from: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
Utils.prototype.isNode = function(o) {
    return (
        typeof Node === "object" ? o instanceof Node :
        o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
    );
};

//Returns true if it is a DOM element
//taken from: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
Utils.prototype.isElement = function(o) {
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
    );
};

Utils.prototype.isNodeOrElement = function(o) {
    return this.isNode(o) || this.isElement(o);
};

//adds all type of change listeners to an element, intended to be a text field
Utils.prototype.addChangeListener = function(element, listener) {
    element.addEventListener("changed", listener);
    element.addEventListener("paste", listener);
    element.addEventListener("input", listener);
};

//if value is undefined, null or blank, returns null, otherwise returns the value
Utils.prototype.makeNull = function(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    } else {
        return value;
    }
};

Utils.prototype.removeAllChildren = function(node) {
    if (node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.lastChild);
        }
    }
};

//adds an element to a div, but also adds a background checking for clicks,
//so that when the background is clicked, the child is removed again, giving
//a model look to popups.
Utils.prototype.addAsModalPopup = function(eParent, eChild) {
    var eBackdrop = document.createElement("div");
    eBackdrop.className = "ag-popup-backdrop";

    eBackdrop.onclick = function() {
        eParent.removeChild(eChild);
        eParent.removeChild(eBackdrop);
    };

    eParent.appendChild(eBackdrop);
    eParent.appendChild(eChild);
};

//loads the template and returns it as an element. makes up for no simple way in
//the dom api to load html directly, eg we cannot do this: document.createElement(template)
Utils.prototype.loadTemplate = function(template) {
    var tempDiv = document.createElement("div");
    tempDiv.innerHTML = template;
    return tempDiv.firstChild;
};

//if passed '42px' then returns the number 42
Utils.prototype.pixelStringToNumber = function(val) {
    if (typeof val === "string") {
        if (val.indexOf("px") >= 0) {
            val.replace("px", "");
        }
        return parseInt(val);
    } else {
        return val;
    }
};

Utils.prototype.querySelectorAll_addCssClass = function(eParent, selector, cssClass) {
    var eRows = eParent.querySelectorAll(selector);
    for (var k = 0; k < eRows.length; k++) {
        this.addCssClass(eRows[k], cssClass);
    }
};

Utils.prototype.querySelectorAll_removeCssClass = function(eParent, selector, cssClass) {
    var eRows = eParent.querySelectorAll(selector);
    for (var k = 0; k < eRows.length; k++) {
        this.removeCssClass(eRows[k], cssClass);
    }
};

Utils.prototype.querySelectorAll_replaceCssClass = function(eParent, selector, cssClassToRemove, cssClassToAdd) {
    var eRows = eParent.querySelectorAll(selector);
    for (var k = 0; k < eRows.length; k++) {
        this.removeCssClass(eRows[k], cssClassToRemove);
        this.addCssClass(eRows[k], cssClassToAdd);
    }
};

Utils.prototype.addOrRemoveCssClass = function(element, className, addOrRemove) {
    if (addOrRemove) {
        this.addCssClass(element, className);
    } else {
        this.removeCssClass(element, className);
    }
};

Utils.prototype.addCssClass = function(element, className) {
    if (element.className && element.className.length > 0) {
        var cssClasses = element.className.split(' ');
        if (cssClasses.indexOf(className) < 0) {
            cssClasses.push(className);
            element.className = cssClasses.join(' ');
        }
    } else {
        element.className = className;
    }
};

Utils.prototype.offsetHeight = function(element) {
    return element && element.clientHeight ? element.clientHeight : 0;
};

Utils.prototype.offsetWidth = function(element) {
    return element && element.clientWidth ? element.clientWidth : 0;
};

Utils.prototype.removeCssClass = function(element, className) {
    if (element.className && element.className.length > 0) {
        var cssClasses = element.className.split(' ');
        var index = cssClasses.indexOf(className);
        if (index >= 0) {
            cssClasses.splice(index, 1);
            element.className = cssClasses.join(' ');
        }
    }
};

Utils.prototype.removeFromArray = function(array, object) {
    array.splice(array.indexOf(object), 1);
};

Utils.prototype.defaultComparator = function(valueA, valueB) {
    var valueAMissing = valueA === null || valueA === undefined;
    var valueBMissing = valueB === null || valueB === undefined;
    if (valueAMissing && valueBMissing) {
        return 0;
    }
    if (valueAMissing) {
        return -1;
    }
    if (valueBMissing) {
        return 1;
    }

    if (valueA < valueB) {
        return -1;
    } else if (valueA > valueB) {
        return 1;
    } else {
        return 0;
    }
};

Utils.prototype.formatWidth = function(width) {
    if (typeof width === "number") {
        return width + "px";
    } else {
        return width;
    }
};

// tries to use the provided renderer. if a renderer found, returns true.
// if no renderer, returns false.
Utils.prototype.useRenderer = function(eParent, eRenderer, params) {
    var resultFromRenderer = eRenderer(params);
    if (this.isNode(resultFromRenderer) || this.isElement(resultFromRenderer)) {
        //a dom node or element was returned, so add child
        eParent.appendChild(resultFromRenderer);
    } else {
        //otherwise assume it was html, so just insert
        var eTextSpan = document.createElement('span');
        eTextSpan.innerHTML = resultFromRenderer;
        eParent.appendChild(eTextSpan);
    }
};

// if icon provided, use this (either a string, or a function callback).
// if not, then use the second parameter, which is the svgFactory function
Utils.prototype.createIcon = function(iconName, gridOptionsWrapper, colDefWrapper, svgFactoryFunc) {
    var eResult = document.createElement('span');
    var userProvidedIcon;
    // check col for icon first
    if (colDefWrapper && colDefWrapper.colDef.icons) {
        userProvidedIcon = colDefWrapper.colDef.icons[iconName];
    }
    // it not in col, try grid options
    if (!userProvidedIcon && gridOptionsWrapper.getIcons()) {
        userProvidedIcon = gridOptionsWrapper.getIcons()[iconName];
    }
    // now if user provided, use it
    if (userProvidedIcon) {
        var rendererResult;
        if (typeof userProvidedIcon === 'function') {
            rendererResult = userProvidedIcon();
        } else if (typeof userProvidedIcon === 'string') {
            rendererResult = userProvidedIcon;
        } else {
            throw 'icon from grid options needs to be a string or a function';
        }
        if (typeof rendererResult === 'string') {
            eResult.innerHTML = rendererResult;
        } else if (this.isNodeOrElement(rendererResult)) {
            eResult.appendChild(rendererResult);
        } else {
            throw 'iconRenderer should return back a string or a dom object';
        }
    } else {
        // otherwise we use the built in icon
        eResult.appendChild(svgFactoryFunc());
    }
    return eResult;
};


Utils.prototype.getScrollbarWidth = function () {
    var outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.width = "100px";
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

    document.body.appendChild(outer);

    var widthNoScroll = outer.offsetWidth;
    // force scrollbars
    outer.style.overflow = "scroll";

    // add innerdiv
    var inner = document.createElement("div");
    inner.style.width = "100%";
    outer.appendChild(inner);

    var widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    return widthNoScroll - widthWithScroll;
};

Utils.prototype.isKeyPressed = function(event, keyToCheck) {
    var pressedKey = event.which || event.keyCode;
    return pressedKey === keyToCheck;
};

Utils.prototype.setVisible = function(element, visible) {
    if (visible) {
        element.style.display = 'inline';
    } else {
        element.style.display = 'none';
    }
};

module.exports = new Utils();

},{}],39:[function(require,module,exports){
module.exports = "<div class=ag-list-selection><div><div ag-repeat></div></div></div>";

},{}],40:[function(require,module,exports){
var template = require('./checkboxSelection.html');
var utils = require('../utils');
var dragAndDropService = require('../dragAndDrop/dragAndDropService');

var NOT_DROP_TARGET = 0;
var DROP_TARGET_ABOVE = 1;
var DROP_TARGET_BELOW = -11;

function CheckboxSelection() {
    this.setupComponents();
    this.uniqueId = 'CheckboxSelection-' + Math.random();
    this.modelChangedListeners = [];
    this.dragSources = [];
    this.setupAsDropTarget();
}

CheckboxSelection.prototype.setEmptyMessage = function(emptyMessage) {
    return this.emptyMessage = emptyMessage;
    this.refreshView();
};

CheckboxSelection.prototype.getUniqueId = function() {
    return this.uniqueId;
};

CheckboxSelection.prototype.addDragSource = function(dragSource) {
    this.dragSources.push(dragSource);
};

CheckboxSelection.prototype.addModelChangedListener = function(listener) {
    this.modelChangedListeners.push(listener);
};

CheckboxSelection.prototype.fireModelChanged = function() {
    for (var i = 0; i<this.modelChangedListeners.length; i++) {
        this.modelChangedListeners[i]();
    }
};

CheckboxSelection.prototype.setupComponents = function() {

    this.eGui = utils.loadTemplate(template);
    this.eFilterValueTemplate = this.eGui.querySelector("[ag-repeat]");

    this.eListParent = this.eFilterValueTemplate.parentNode;
    utils.removeAllChildren(this.eListParent);
};

CheckboxSelection.prototype.setModel = function(model) {
    this.model = model;
    this.refreshView();
};

CheckboxSelection.prototype.getModel = function() {
    return this.model;
};

CheckboxSelection.prototype.setCellRenderer = function(cellRenderer) {
    this.cellRenderer = cellRenderer;
};

CheckboxSelection.prototype.refreshView = function() {
    utils.removeAllChildren(this.eListParent);

    if (this.model && this.model.length > 0) {
        this.insertRows();
    } else {
        this.insertBlankMessage();
    }
};

CheckboxSelection.prototype.insertRows = function() {
    for (var i = 0; i<this.model.length; i++) {
        var item = this.model[i];
        //var text = this.getText(item);
        //var selected = this.isSelected(item);
        var eListItem = this.eFilterValueTemplate.cloneNode(true);

        if (this.cellRenderer) {
            var params = {value: item};
            utils.useRenderer(eListItem, this.cellRenderer, params);
        } else {
            eListItem.innerHTML = item;
        }

        this.addDragAndDropToListItem(eListItem, item);
        this.eListParent.appendChild(eListItem);
    }
};

CheckboxSelection.prototype.insertBlankMessage = function() {
    if (this.emptyMessage) {
        var eMessage = document.createElement('div');
        eMessage.style.color = 'grey';
        eMessage.style.padding = '20px';
        eMessage.style.textAlign = 'center';
        eMessage.innerHTML = this.emptyMessage;
        this.eListParent.appendChild(eMessage);
    }
};

CheckboxSelection.prototype.getDragItem = function() {
    return this.dragItem;
};

CheckboxSelection.prototype.setupAsDropTarget = function() {

    dragAndDropService.addDropTarget(this.eGui, {
        acceptDrag: this.externalAcceptDrag.bind(this),
        drop: this.externalDrop.bind(this),
        noDrop: this.externalNoDrop.bind(this)
    });
};

CheckboxSelection.prototype.externalAcceptDrag = function(dragEvent) {
    var allowedSource = this.dragSources.indexOf(dragEvent.containerId) >= 0;
    if (!allowedSource) {
        return false;
    }
    var alreadyHaveCol = this.model.indexOf(dragEvent.data) >= 0;
    if (alreadyHaveCol) {
        return false;
    }
    this.eGui.style.backgroundColor = 'lightgreen';
    return true;
};

CheckboxSelection.prototype.externalDrop = function(dragEvent) {
    this.addItemToList(dragEvent.data);
    this.eGui.style.backgroundColor = '';
};

CheckboxSelection.prototype.externalNoDrop = function() {
    this.eGui.style.backgroundColor = '';
};

CheckboxSelection.prototype.addItemToList = function(newItem) {
    this.model.push(newItem);
    this.refreshView();
    this.fireModelChanged();
};

CheckboxSelection.prototype.addDragAndDropToListItem = function(eListItem, item) {
    var that = this;
    dragAndDropService.addDragSource(eListItem, {
        getData: function() { return item; },
        getContainerId: function() { return that.uniqueId; }
    });
    dragAndDropService.addDropTarget(eListItem, {
        acceptDrag: function (dragItem) { return that.internalAcceptDrag(item, dragItem, eListItem); },
        drop: function (dragItem) { that.internalDrop(item, dragItem.data); },
        noDrop: function () { that.internalNoDrop(eListItem); }
    });
};

CheckboxSelection.prototype.internalAcceptDrag = function(targetColumn, dragItem, eListItem) {
    var result = dragItem.data !== targetColumn && dragItem.containerId === this.uniqueId;
    if (result) {
        if (this.dragAfterThisItem(targetColumn, dragItem.data)) {
            this.setDropCssClasses(eListItem, DROP_TARGET_ABOVE);
        } else {
            this.setDropCssClasses(eListItem, DROP_TARGET_BELOW);
        }
    }
    return result;
};

CheckboxSelection.prototype.internalDrop = function(targetColumn, draggedColumn) {
    var oldIndex = this.model.indexOf(draggedColumn);
    var newIndex = this.model.indexOf(targetColumn);

    this.model.splice(oldIndex, 1);
    this.model.splice(newIndex, 0, draggedColumn);

    this.refreshView();
    this.fireModelChanged();
};

CheckboxSelection.prototype.internalNoDrop = function(eListItem) {
    this.setDropCssClasses(eListItem, NOT_DROP_TARGET);
};

CheckboxSelection.prototype.dragAfterThisItem = function(targetColumn, draggedColumn) {
    return this.model.indexOf(targetColumn) < this.model.indexOf(draggedColumn);
};

CheckboxSelection.prototype.setDropCssClasses = function(eListItem, state) {
    utils.addOrRemoveCssClass(eListItem, 'ag-not-drop-target', state === NOT_DROP_TARGET);
    utils.addOrRemoveCssClass(eListItem, 'ag-drop-target-above', state === DROP_TARGET_ABOVE);
    utils.addOrRemoveCssClass(eListItem, 'ag-drop-target-below', state === DROP_TARGET_BELOW);
};

CheckboxSelection.prototype.getGui = function() {
    return this.eGui;
};

module.exports = CheckboxSelection;

},{"../dragAndDrop/dragAndDropService":5,"../utils":38,"./checkboxSelection.html":39}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvbWFpbi5qcyIsInNyYy9qcy9jZWxsUmVuZGVyZXJzL2dyb3VwQ2VsbFJlbmRlcmVyRmFjdG9yeS5qcyIsInNyYy9qcy9jb2x1bW5Db250cm9sbGVyLmpzIiwic3JjL2pzL2NvbnN0YW50cy5qcyIsInNyYy9qcy9kcmFnQW5kRHJvcC9kcmFnQW5kRHJvcFNlcnZpY2UuanMiLCJzcmMvanMvZXhwcmVzc2lvblNlcnZpY2UuanMiLCJzcmMvanMvZmlsdGVyL2ZpbHRlck1hbmFnZXIuanMiLCJzcmMvanMvZmlsdGVyL251bWJlckZpbHRlci5odG1sIiwic3JjL2pzL2ZpbHRlci9udW1iZXJGaWx0ZXIuanMiLCJzcmMvanMvZmlsdGVyL3NldEZpbHRlci5odG1sIiwic3JjL2pzL2ZpbHRlci9zZXRGaWx0ZXIuanMiLCJzcmMvanMvZmlsdGVyL3NldEZpbHRlck1vZGVsLmpzIiwic3JjL2pzL2ZpbHRlci90ZXh0RmlsdGVyLmh0bWwiLCJzcmMvanMvZmlsdGVyL3RleHRGaWx0ZXIuanMiLCJzcmMvanMvZ3JpZC5qcyIsInNyYy9qcy9ncmlkT3B0aW9uc1dyYXBwZXIuanMiLCJzcmMvanMvZ3JpZFBhbmVsL2dyaWQuaHRtbCIsInNyYy9qcy9ncmlkUGFuZWwvZ3JpZE5vU2Nyb2xscy5odG1sIiwic3JjL2pzL2dyaWRQYW5lbC9ncmlkUGFuZWwuanMiLCJzcmMvanMvZ3JpZFBhbmVsL2xvYWRpbmcuaHRtbCIsInNyYy9qcy9ncm91cENyZWF0b3IuanMiLCJzcmMvanMvaGVhZGVyUmVuZGVyZXIuanMiLCJzcmMvanMvbGF5b3V0L0JvcmRlckxheW91dC5qcyIsInNyYy9qcy9sYXlvdXQvdmVydGljYWxTdGFjay5qcyIsInNyYy9qcy9yb3dDb250cm9sbGVycy9pbk1lbW9yeVJvd0NvbnRyb2xsZXIuanMiLCJzcmMvanMvcm93Q29udHJvbGxlcnMvcGFnaW5hdGlvbkNvbnRyb2xsZXIuanMiLCJzcmMvanMvcm93Q29udHJvbGxlcnMvcGFnaW5hdGlvblBhbmVsLmh0bWwiLCJzcmMvanMvcm93Q29udHJvbGxlcnMvdmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLmpzIiwic3JjL2pzL3Jvd1JlbmRlcmVyLmpzIiwic3JjL2pzL3NlbGVjdGlvbkNvbnRyb2xsZXIuanMiLCJzcmMvanMvc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LmpzIiwic3JjL2pzL3N2Z0ZhY3RvcnkuanMiLCJzcmMvanMvdGVtcGxhdGVTZXJ2aWNlLmpzIiwic3JjL2pzL3Rvb2xQYW5lbC9jb2x1bW5TZWxlY3Rpb25QYW5lbC5qcyIsInNyYy9qcy90b29sUGFuZWwvZ3JvdXBTZWxlY3Rpb25QYW5lbC5qcyIsInNyYy9qcy90b29sUGFuZWwvdG9vbFBhbmVsLmpzIiwic3JjL2pzL3V0aWxzLmpzIiwic3JjL2pzL3dpZGdldHMvY2hlY2tib3hTZWxlY3Rpb24uaHRtbCIsInNyYy9qcy93aWRnZXRzL2NoZWNrYm94U2VsZWN0aW9uLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hTQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU1BO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SUE7QUFDQTs7QUNEQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaGtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1aEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xRQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4eENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVXQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBBbmd1bGFyIEdyaWRcbi8vIFdyaXR0ZW4gYnkgTmlhbGwgQ3Jvc2J5XG4vLyB3d3cuYW5ndWxhcmdyaWQuY29tXG4vL1xuLy8gVmVyc2lvbiAxLjEwLjFcblxuKGZ1bmN0aW9uKCkge1xuXG4gICAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2Agb3IgYGV4cG9ydHNgXG4gICAgdmFyIHJvb3QgPSB0aGlzO1xuICAgIHZhciBHcmlkID0gcmVxdWlyZSgnLi9ncmlkJyk7XG5cbiAgICAvLyBpZiBhbmd1bGFyIGlzIHByZXNlbnQsIHJlZ2lzdGVyIHRoZSBkaXJlY3RpdmVcbiAgICBpZiAodHlwZW9mIGFuZ3VsYXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciBhbmd1bGFyTW9kdWxlID0gYW5ndWxhci5tb2R1bGUoXCJhbmd1bGFyR3JpZFwiLCBbXSk7XG4gICAgICAgIGFuZ3VsYXJNb2R1bGUuZGlyZWN0aXZlKFwiYW5ndWxhckdyaWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFcIixcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRlbGVtZW50JywgJyRzY29wZScsICckY29tcGlsZScsIEFuZ3VsYXJEaXJlY3RpdmVDb250cm9sbGVyXSxcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICBhbmd1bGFyR3JpZDogXCI9XCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgYW5ndWxhck1vZHVsZS5kaXJlY3RpdmUoXCJhZ0dyaWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlc3RyaWN0OiBcIkFcIixcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRlbGVtZW50JywgJyRzY29wZScsICckY29tcGlsZScsICckYXR0cnMnLCBBbmd1bGFyRGlyZWN0aXZlQ29udHJvbGxlcl0sXG4gICAgICAgICAgICAgICAgc2NvcGU6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyR3JpZEdsb2JhbEZ1bmN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIGV4cG9ydHMuYW5ndWxhckdyaWQgPSBhbmd1bGFyR3JpZEdsb2JhbEZ1bmN0aW9uO1xuICAgIH1cblxuICAgIHJvb3QuYW5ndWxhckdyaWQgPSBhbmd1bGFyR3JpZEdsb2JhbEZ1bmN0aW9uO1xuXG4gICAgZnVuY3Rpb24gQW5ndWxhckRpcmVjdGl2ZUNvbnRyb2xsZXIoJGVsZW1lbnQsICRzY29wZSwgJGNvbXBpbGUsICRhdHRycykge1xuICAgICAgICB2YXIgZ3JpZE9wdGlvbnM7XG4gICAgICAgIHZhciBxdWlja0ZpbHRlck9uU2NvcGU7XG4gICAgICAgIGlmICgkYXR0cnMpIHtcbiAgICAgICAgICAgIC8vIG5ldyBkaXJlY3RpdmUgb2YgYWctZ3JpZFxuICAgICAgICAgICAgdmFyIGtleU9mR3JpZEluU2NvcGUgPSAkYXR0cnMuYWdHcmlkO1xuICAgICAgICAgICAgcXVpY2tGaWx0ZXJPblNjb3BlID0ga2V5T2ZHcmlkSW5TY29wZSArICcucXVpY2tGaWx0ZXJUZXh0JztcbiAgICAgICAgICAgIGdyaWRPcHRpb25zID0gJHNjb3BlLiRldmFsKGtleU9mR3JpZEluU2NvcGUpO1xuICAgICAgICAgICAgaWYgKCFncmlkT3B0aW9ucykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIldBUk5JTkcgLSBncmlkIG9wdGlvbnMgZm9yIEFuZ3VsYXIgR3JpZCBub3QgZm91bmQuIFBsZWFzZSBlbnN1cmUgdGhlIGF0dHJpYnV0ZSBhZy1ncmlkIHBvaW50cyB0byBhIHZhbGlkIG9iamVjdCBvbiB0aGUgc2NvcGVcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gb2xkIGRpcmVjdGl2ZSBvZiBhbmd1bGFyLWdyaWRcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIldBUk5JTkcgLSBEaXJlY3RpdmUgYW5ndWxhci1ncmlkIGlzIGRlcHJlY2F0ZWQsIHlvdSBzaG91bGQgdXNlIHRoZSBhZy1ncmlkIGRpcmVjdGl2ZSBpbnN0ZWFkLlwiKTtcbiAgICAgICAgICAgIGdyaWRPcHRpb25zID0gJHNjb3BlLmFuZ3VsYXJHcmlkO1xuICAgICAgICAgICAgcXVpY2tGaWx0ZXJPblNjb3BlID0gJ2FuZ3VsYXJHcmlkLnF1aWNrRmlsdGVyVGV4dCc7XG4gICAgICAgICAgICBpZiAoIWdyaWRPcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiV0FSTklORyAtIGdyaWQgb3B0aW9ucyBmb3IgQW5ndWxhciBHcmlkIG5vdCBmb3VuZC4gUGxlYXNlIGVuc3VyZSB0aGUgYXR0cmlidXRlIGFuZ3VsYXItZ3JpZCBwb2ludHMgdG8gYSB2YWxpZCBvYmplY3Qgb24gdGhlIHNjb3BlXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBlR3JpZERpdiA9ICRlbGVtZW50WzBdO1xuICAgICAgICB2YXIgZ3JpZCA9IG5ldyBHcmlkKGVHcmlkRGl2LCBncmlkT3B0aW9ucywgJHNjb3BlLCAkY29tcGlsZSwgcXVpY2tGaWx0ZXJPblNjb3BlKTtcblxuICAgICAgICAkc2NvcGUuJG9uKFwiJGRlc3Ryb3lcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBncmlkLnNldEZpbmlzaGVkKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEdsb2JhbCBGdW5jdGlvbiAtIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCBmb3IgY3JlYXRpbmcgYSBncmlkLCBvdXRzaWRlIG9mIGFueSBBbmd1bGFySlNcbiAgICBmdW5jdGlvbiBhbmd1bGFyR3JpZEdsb2JhbEZ1bmN0aW9uKGVsZW1lbnQsIGdyaWRPcHRpb25zKSB7XG4gICAgICAgIC8vIHNlZSBpZiBlbGVtZW50IGlzIGEgcXVlcnkgc2VsZWN0b3IsIG9yIGEgcmVhbCBlbGVtZW50XG4gICAgICAgIHZhciBlR3JpZERpdjtcbiAgICAgICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZUdyaWREaXYgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKCFlR3JpZERpdikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignV0FSTklORyAtIHdhcyBub3QgYWJsZSB0byBmaW5kIGVsZW1lbnQgJyArIGVsZW1lbnQgKyAnIGluIHRoZSBET00sIEFuZ3VsYXIgR3JpZCBpbml0aWFsaXNhdGlvbiBhYm9ydGVkLicpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVHcmlkRGl2ID0gZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBuZXcgR3JpZChlR3JpZERpdiwgZ3JpZE9wdGlvbnMsIG51bGwsIG51bGwpO1xuICAgIH1cblxufSkuY2FsbCh3aW5kb3cpO1xuIiwidmFyIFN2Z0ZhY3RvcnkgPSByZXF1aXJlKCcuLi9zdmdGYWN0b3J5Jyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4uL2NvbnN0YW50cycpO1xudmFyIHN2Z0ZhY3RvcnkgPSBuZXcgU3ZnRmFjdG9yeSgpO1xuXG5mdW5jdGlvbiBncm91cENlbGxSZW5kZXJlckZhY3RvcnkoZ3JpZE9wdGlvbnNXcmFwcGVyLCBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkpIHtcblxuICAgIHJldHVybiBmdW5jdGlvbiBncm91cENlbGxSZW5kZXJlcihwYXJhbXMpIHtcblxuICAgICAgICB2YXIgZUdyb3VwQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgdmFyIG5vZGUgPSBwYXJhbXMubm9kZTtcblxuICAgICAgICB2YXIgY2VsbEV4cGFuZGFibGUgPSBub2RlLmdyb3VwICYmICFub2RlLmZvb3RlcjtcbiAgICAgICAgaWYgKGNlbGxFeHBhbmRhYmxlKSB7XG4gICAgICAgICAgICBhZGRFeHBhbmRBbmRDb250cmFjdChlR3JvdXBDZWxsLCBwYXJhbXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGNoZWNrYm94TmVlZGVkID0gcGFyYW1zLmNvbERlZiAmJiBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlciAmJiBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlci5jaGVja2JveCAmJiAhbm9kZS5mb290ZXI7XG4gICAgICAgIGlmIChjaGVja2JveE5lZWRlZCkge1xuICAgICAgICAgICAgdmFyIGVDaGVja2JveCA9IHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeS5jcmVhdGVTZWxlY3Rpb25DaGVja2JveChub2RlLCBwYXJhbXMucm93SW5kZXgpO1xuICAgICAgICAgICAgZUdyb3VwQ2VsbC5hcHBlbmRDaGlsZChlQ2hlY2tib3gpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcmFtcy5jb2xEZWYgJiYgcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXIgJiYgcGFyYW1zLmNvbERlZi5jZWxsUmVuZGVyZXIuaW5uZXJSZW5kZXJlcikge1xuICAgICAgICAgICAgY3JlYXRlRnJvbUlubmVyUmVuZGVyZXIoZUdyb3VwQ2VsbCwgcGFyYW1zLCBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlci5pbm5lclJlbmRlcmVyKTtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmZvb3Rlcikge1xuICAgICAgICAgICAgY3JlYXRlRm9vdGVyQ2VsbChlR3JvdXBDZWxsLCBwYXJhbXMpO1xuICAgICAgICB9IGVsc2UgaWYgKG5vZGUuZ3JvdXApIHtcbiAgICAgICAgICAgIGNyZWF0ZUdyb3VwQ2VsbChlR3JvdXBDZWxsLCBwYXJhbXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3JlYXRlTGVhZkNlbGwoZUdyb3VwQ2VsbCwgcGFyYW1zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG9ubHkgZG8gdGhpcyBpZiBhbiBpbmRlbnQgLSBhcyB0aGlzIG92ZXJ3cml0ZXMgdGhlIHBhZGRpbmcgdGhhdFxuICAgICAgICAvLyB0aGUgdGhlbWUgc2V0LCB3aGljaCB3aWxsIG1ha2UgdGhpbmdzIGxvb2sgJ25vdCBhbGlnbmVkJyBmb3IgdGhlXG4gICAgICAgIC8vIGZpcnN0IGdyb3VwIGxldmVsLlxuICAgICAgICBpZiAobm9kZS5mb290ZXIgfHwgbm9kZS5sZXZlbCA+IDApIHtcbiAgICAgICAgICAgIHZhciBwYWRkaW5nUHggPSBub2RlLmxldmVsICogMTA7XG4gICAgICAgICAgICBpZiAobm9kZS5mb290ZXIpIHtcbiAgICAgICAgICAgICAgICBwYWRkaW5nUHggKz0gMTA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFub2RlLmdyb3VwKSB7XG4gICAgICAgICAgICAgICAgcGFkZGluZ1B4ICs9IDU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlR3JvdXBDZWxsLnN0eWxlLnBhZGRpbmdMZWZ0ID0gcGFkZGluZ1B4ICsgJ3B4JztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlR3JvdXBDZWxsO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBhZGRFeHBhbmRBbmRDb250cmFjdChlR3JvdXBDZWxsLCBwYXJhbXMpIHtcblxuICAgICAgICB2YXIgZUV4cGFuZEljb24gPSBjcmVhdGVHcm91cEV4cGFuZEljb24odHJ1ZSk7XG4gICAgICAgIHZhciBlQ29udHJhY3RJY29uID0gY3JlYXRlR3JvdXBFeHBhbmRJY29uKGZhbHNlKTtcbiAgICAgICAgZUdyb3VwQ2VsbC5hcHBlbmRDaGlsZChlRXhwYW5kSWNvbik7XG4gICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUNvbnRyYWN0SWNvbik7XG5cbiAgICAgICAgZUV4cGFuZEljb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBleHBhbmRPckNvbnRyYWN0KTtcbiAgICAgICAgZUNvbnRyYWN0SWNvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV4cGFuZE9yQ29udHJhY3QpO1xuICAgICAgICBlR3JvdXBDZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2RibGNsaWNrJywgZXhwYW5kT3JDb250cmFjdCk7XG5cbiAgICAgICAgc2hvd0FuZEhpZGVFeHBhbmRBbmRDb250cmFjdChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgcGFyYW1zLm5vZGUuZXhwYW5kZWQpO1xuXG4gICAgICAgIC8vIGlmIHBhcmVudCBjZWxsIHdhcyBwYXNzZWQsIHRoZW4gd2UgY2FuIGxpc3RlbiBmb3Igd2hlbiBmb2N1cyBpcyBvbiB0aGUgY2VsbCxcbiAgICAgICAgLy8gYW5kIHRoZW4gZXhwYW5kIC8gY29udHJhY3QgYXMgdGhlIHVzZXIgaGl0cyBlbnRlciBvciBzcGFjZS1iYXJcbiAgICAgICAgaWYgKHBhcmFtcy5lR3JpZENlbGwpIHtcbiAgICAgICAgICAgIHBhcmFtcy5lR3JpZENlbGwuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKHV0aWxzLmlzS2V5UHJlc3NlZChldmVudCwgY29uc3RhbnRzLktFWV9FTlRFUikpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwYW5kT3JDb250cmFjdCgpO1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZXhwYW5kT3JDb250cmFjdCgpIHtcbiAgICAgICAgICAgIGV4cGFuZEdyb3VwKGVFeHBhbmRJY29uLCBlQ29udHJhY3RJY29uLCBwYXJhbXMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2hvd0FuZEhpZGVFeHBhbmRBbmRDb250cmFjdChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgZXhwYW5kZWQpIHtcbiAgICAgICAgdXRpbHMuc2V0VmlzaWJsZShlRXhwYW5kSWNvbiwgIWV4cGFuZGVkKTtcbiAgICAgICAgdXRpbHMuc2V0VmlzaWJsZShlQ29udHJhY3RJY29uLCBleHBhbmRlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlRnJvbUlubmVyUmVuZGVyZXIoZUdyb3VwQ2VsbCwgcGFyYW1zLCByZW5kZXJlcikge1xuICAgICAgICB1dGlscy51c2VSZW5kZXJlcihlR3JvdXBDZWxsLCByZW5kZXJlciwgcGFyYW1zKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBleHBhbmRHcm91cChlRXhwYW5kSWNvbiwgZUNvbnRyYWN0SWNvbiwgcGFyYW1zKSB7XG4gICAgICAgIHBhcmFtcy5ub2RlLmV4cGFuZGVkID0gIXBhcmFtcy5ub2RlLmV4cGFuZGVkO1xuICAgICAgICBwYXJhbXMuYXBpLm9uR3JvdXBFeHBhbmRlZE9yQ29sbGFwc2VkKHBhcmFtcy5yb3dJbmRleCArIDEpO1xuICAgICAgICBzaG93QW5kSGlkZUV4cGFuZEFuZENvbnRyYWN0KGVFeHBhbmRJY29uLCBlQ29udHJhY3RJY29uLCBwYXJhbXMubm9kZS5leHBhbmRlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlR3JvdXBFeHBhbmRJY29uKGV4cGFuZGVkKSB7XG4gICAgICAgIHZhciBlSWNvbjtcbiAgICAgICAgaWYgKGV4cGFuZGVkKSB7XG4gICAgICAgICAgICBlSWNvbiA9IHV0aWxzLmNyZWF0ZUljb24oJ2dyb3VwQ29udHJhY3RlZCcsIGdyaWRPcHRpb25zV3JhcHBlciwgbnVsbCwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd1JpZ2h0U3ZnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVJY29uID0gdXRpbHMuY3JlYXRlSWNvbignZ3JvdXBFeHBhbmRlZCcsIGdyaWRPcHRpb25zV3JhcHBlciwgbnVsbCwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd0Rvd25TdmcpO1xuICAgICAgICB9XG4gICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKGVJY29uLCAnYWctZ3JvdXAtZXhwYW5kJyk7XG4gICAgICAgIHJldHVybiBlSWNvbjtcbiAgICB9XG5cbiAgICAvLyBjcmVhdGVzIGNlbGwgd2l0aCAnVG90YWwge3trZXl9fScgZm9yIGEgZ3JvdXBcbiAgICBmdW5jdGlvbiBjcmVhdGVGb290ZXJDZWxsKGVHcm91cENlbGwsIHBhcmFtcykge1xuICAgICAgICB2YXIgdGV4dFRvRGlzcGxheSA9IFwiVG90YWwgXCIgKyBnZXRHcm91cE5hbWUocGFyYW1zKTtcbiAgICAgICAgdmFyIGVUZXh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGV4dFRvRGlzcGxheSk7XG4gICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZVRleHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldEdyb3VwTmFtZShwYXJhbXMpIHtcbiAgICAgICAgdmFyIGNlbGxSZW5kZXJlciA9IHBhcmFtcy5jb2xEZWYuY2VsbFJlbmRlcmVyO1xuICAgICAgICBpZiAoY2VsbFJlbmRlcmVyICYmIGNlbGxSZW5kZXJlci5rZXlNYXBcbiAgICAgICAgICAgICYmIHR5cGVvZiBjZWxsUmVuZGVyZXIua2V5TWFwID09PSAnb2JqZWN0JyAmJiBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlRnJvbU1hcCA9IGNlbGxSZW5kZXJlci5rZXlNYXBbcGFyYW1zLm5vZGUua2V5XTtcbiAgICAgICAgICAgIGlmICh2YWx1ZUZyb21NYXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVGcm9tTWFwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW1zLm5vZGUua2V5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcy5ub2RlLmtleTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNyZWF0ZXMgY2VsbCB3aXRoICd7e2tleX19ICh7e2NoaWxkQ291bnR9fSknIGZvciBhIGdyb3VwXG4gICAgZnVuY3Rpb24gY3JlYXRlR3JvdXBDZWxsKGVHcm91cENlbGwsIHBhcmFtcykge1xuICAgICAgICB2YXIgZ3JvdXBOYW1lID0gZ2V0R3JvdXBOYW1lKHBhcmFtcyk7XG5cbiAgICAgICAgdmFyIGNvbERlZk9mR3JvdXBlZENvbCA9IHBhcmFtcy5hcGkuZ2V0Q29sdW1uRGVmKHBhcmFtcy5ub2RlLmZpZWxkKTtcbiAgICAgICAgaWYgKGNvbERlZk9mR3JvdXBlZENvbCAmJiB0eXBlb2YgY29sRGVmT2ZHcm91cGVkQ29sLmNlbGxSZW5kZXJlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcGFyYW1zLnZhbHVlID0gZ3JvdXBOYW1lO1xuICAgICAgICAgICAgdXRpbHMudXNlUmVuZGVyZXIoZUdyb3VwQ2VsbCwgY29sRGVmT2ZHcm91cGVkQ29sLmNlbGxSZW5kZXJlciwgcGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVHcm91cENlbGwuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZ3JvdXBOYW1lKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBvbmx5IGluY2x1ZGUgdGhlIGNoaWxkIGNvdW50IGlmIGl0J3MgaW5jbHVkZWQsIGVnIGlmIHVzZXIgZG9pbmcgY3VzdG9tIGFnZ3JlZ2F0aW9uLFxuICAgICAgICAvLyB0aGVuIHRoaXMgY291bGQgYmUgbGVmdCBvdXQsIG9yIHNldCB0byAtMSwgaWUgbm8gY2hpbGQgY291bnRcbiAgICAgICAgdmFyIHN1cHByZXNzQ291bnQgPSBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlciAmJiBwYXJhbXMuY29sRGVmLmNlbGxSZW5kZXJlci5zdXBwcmVzc0NvdW50O1xuICAgICAgICBpZiAoIXN1cHByZXNzQ291bnQgJiYgcGFyYW1zLm5vZGUuYWxsQ2hpbGRyZW5Db3VudCA+PSAwKSB7XG4gICAgICAgICAgICBlR3JvdXBDZWxsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiIChcIiArIHBhcmFtcy5ub2RlLmFsbENoaWxkcmVuQ291bnQgKyBcIilcIikpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gY3JlYXRlcyBjZWxsIHdpdGggJ3t7a2V5fX0gKHt7Y2hpbGRDb3VudH19KScgZm9yIGEgZ3JvdXBcbiAgICBmdW5jdGlvbiBjcmVhdGVMZWFmQ2VsbChlUGFyZW50LCBwYXJhbXMpIHtcbiAgICAgICAgaWYgKHBhcmFtcy52YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGVUZXh0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJyAnICsgcGFyYW1zLnZhbHVlKTtcbiAgICAgICAgICAgIGVQYXJlbnQuYXBwZW5kQ2hpbGQoZVRleHQpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdyb3VwQ2VsbFJlbmRlcmVyRmFjdG9yeTsiLCJ2YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuZnVuY3Rpb24gQ29sdW1uQ29udHJvbGxlcigpIHtcbiAgICB0aGlzLmxpc3RlbmVycyA9IFtdO1xuICAgIHRoaXMuY3JlYXRlTW9kZWwoKTtcbn1cblxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGFuZ3VsYXJHcmlkLCBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnksIGdyaWRPcHRpb25zV3JhcHBlciwgZXhwcmVzc2lvblNlcnZpY2UpIHtcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XG4gICAgdGhpcy5zZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkgPSBzZWxlY3Rpb25SZW5kZXJlckZhY3Rvcnk7XG4gICAgdGhpcy5leHByZXNzaW9uU2VydmljZSA9IGV4cHJlc3Npb25TZXJ2aWNlO1xufTtcblxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlTW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5tb2RlbCA9IHtcbiAgICAgICAgLy8gdXNlZCBieTpcbiAgICAgICAgLy8gKyBpbk1lbW9yeVJvd0NvbnRyb2xsZXIgLT4gc29ydGluZywgYnVpbGRpbmcgcXVpY2sgZmlsdGVyIHRleHRcbiAgICAgICAgLy8gKyBoZWFkZXJSZW5kZXJlciAtPiBzb3J0aW5nIChjbGVhcmluZyBpY29uKVxuICAgICAgICBnZXRBbGxDb2x1bW5zOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmFsbENvbHVtbnM7XG4gICAgICAgIH0sXG4gICAgICAgIC8vICsgcm93Q29udHJvbGxlciAtPiB3aGlsZSBpbnNlcnRpbmcgcm93cywgYW5kIHdoZW4gdGFiYmluZyB0aHJvdWdoIGNlbGxzIChuZWVkIHRvIGNoYW5nZSB0aGlzKVxuICAgICAgICAvLyBuZWVkIGEgbmV3TWV0aG9kIC0gZ2V0IG5leHQgY29sIGluZGV4XG4gICAgICAgIGdldERpc3BsYXllZENvbHVtbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZGlzcGxheWVkQ29sdW1ucztcbiAgICAgICAgfSxcbiAgICAgICAgLy8gKyB0b29sUGFuZWxcbiAgICAgICAgZ2V0R3JvdXBlZENvbHVtbnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ3JvdXBlZENvbHVtbnM7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHVzZWQgYnk6XG4gICAgICAgIC8vICsgYW5ndWxhckdyaWQgLT4gZm9yIHNldHRpbmcgYm9keSB3aWR0aFxuICAgICAgICAvLyArIHJvd0NvbnRyb2xsZXIgLT4gc2V0dGluZyBtYWluIHJvdyB3aWR0aHMgKHdoZW4gaW5zZXJ0aW5nIGFuZCByZXNpemluZylcbiAgICAgICAgZ2V0Qm9keUNvbnRhaW5lcldpZHRoOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmdldFRvdGFsQ29sV2lkdGgoZmFsc2UpO1xuICAgICAgICB9LFxuICAgICAgICAvLyB1c2VkIGJ5OlxuICAgICAgICAvLyArIGFuZ3VsYXJHcmlkIC0+IHNldHRpbmcgcGlubmVkIGJvZHkgd2lkdGhcbiAgICAgICAgZ2V0UGlubmVkQ29udGFpbmVyV2lkdGg6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ2V0VG90YWxDb2xXaWR0aCh0cnVlKTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gdXNlZCBieTpcbiAgICAgICAgLy8gKyBoZWFkZXJSZW5kZXJlciAtPiBzZXR0aW5nIHBpbm5lZCBib2R5IHdpZHRoXG4gICAgICAgIGdldEhlYWRlckdyb3VwczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5oZWFkZXJHcm91cHM7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHVzZWQgYnk6XG4gICAgICAgIC8vICsgYXBpLmdldEZpbHRlck1vZGVsKCkgLT4gdG8gbWFwIGNvbERlZiB0byBjb2x1bW4sIGtleSBjYW4gYmUgY29sRGVmIG9yIGZpZWxkXG4gICAgICAgIGdldENvbHVtbjogZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5nZXRDb2x1bW4oa2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gSEIgZXh0ZW5zaW9uXG4gICAgICAgIC8vIHVzZWQgYnk6XG4gICAgICAgIC8vICsgZ3JpZCAtPiBzY3JvbGxUb0NvbHVtbkluZGV4XG4gICAgICAgIGdldE9mZnNldEZvckNvbHVtbkluZGV4OiBmdW5jdGlvbihjb2xJbmRleCkge1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IDA7XG4gICAgICAgICAgICB2YXIgbWluID0gTWF0aC5taW4oY29sSW5kZXgsIHRoYXQuYWxsQ29sdW1ucy5sZW5ndGgpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtaW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjb2wgPSB0aGF0LmFsbENvbHVtbnNbaV07XG4gICAgICAgICAgICAgICAgaWYgKCFjb2wucGlubmVkICYmIHRoYXQuZGlzcGxheWVkQ29sdW1ucy5pbmRleE9mKGNvbCkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gY29sLmFjdHVhbFdpZHRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG9mZnNldDtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gdXNlZCBieTpcbiAgICAgICAgLy8gKyByb3dSZW5kZXJlciAtPiBmb3IgbmF2aWdhdGlvblxuICAgICAgICBnZXRWaXNpYmxlQ29sQmVmb3JlOiBmdW5jdGlvbihjb2wpIHtcbiAgICAgICAgICAgIHZhciBvbGRJbmRleCA9IHRoYXQudmlzaWJsZUNvbHVtbnMuaW5kZXhPZihjb2wpO1xuICAgICAgICAgICAgaWYgKG9sZEluZGV4ID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGF0LnZpc2libGVDb2x1bW5zW29sZEluZGV4IC0gMV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyB1c2VkIGJ5OlxuICAgICAgICAvLyArIHJvd1JlbmRlcmVyIC0+IGZvciBuYXZpZ2F0aW9uXG4gICAgICAgIGdldFZpc2libGVDb2xBZnRlcjogZnVuY3Rpb24oY29sKSB7XG4gICAgICAgICAgICB2YXIgb2xkSW5kZXggPSB0aGF0LnZpc2libGVDb2x1bW5zLmluZGV4T2YoY29sKTtcbiAgICAgICAgICAgIGlmIChvbGRJbmRleCA8ICh0aGF0LnZpc2libGVDb2x1bW5zLmxlbmd0aCAtIDEpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoYXQudmlzaWJsZUNvbHVtbnNbb2xkSW5kZXggKyAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldERpc3BsYXlOYW1lRm9yQ29sOiBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmdldERpc3BsYXlOYW1lRm9yQ29sKGNvbHVtbik7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuZ2V0Q29sdW1uID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGk8dGhpcy5hbGxDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb2xEZWZNYXRjaGVzID0gdGhpcy5hbGxDb2x1bW5zW2ldLmNvbERlZiA9PT0ga2V5O1xuICAgICAgICB2YXIgZmllbGRNYXRjaGVzID0gdGhpcy5hbGxDb2x1bW5zW2ldLmNvbERlZi5maWVsZCA9PT0ga2V5O1xuICAgICAgICBpZiAoY29sRGVmTWF0Y2hlcyB8fCBmaWVsZE1hdGNoZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFsbENvbHVtbnNbaV07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5nZXREaXNwbGF5TmFtZUZvckNvbCA9IGZ1bmN0aW9uKGNvbHVtbikge1xuXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XG4gICAgdmFyIGhlYWRlclZhbHVlR2V0dGVyID0gY29sRGVmLmhlYWRlclZhbHVlR2V0dGVyO1xuXG4gICAgaWYgKGhlYWRlclZhbHVlR2V0dGVyKSB7XG4gICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcbiAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCksXG4gICAgICAgICAgICBjb250ZXh0OiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KClcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGhlYWRlclZhbHVlR2V0dGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyB2YWx1ZUdldHRlciBpcyBhIGZ1bmN0aW9uLCBzbyBqdXN0IGNhbGwgaXRcbiAgICAgICAgICAgIHJldHVybiBoZWFkZXJWYWx1ZUdldHRlcihwYXJhbXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBoZWFkZXJWYWx1ZUdldHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIHZhbHVlR2V0dGVyIGlzIGFuIGV4cHJlc3Npb24sIHNvIGV4ZWN1dGUgdGhlIGV4cHJlc3Npb25cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmV4cHJlc3Npb25TZXJ2aWNlLmV2YWx1YXRlKGhlYWRlclZhbHVlR2V0dGVyLCBwYXJhbXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHV0aWxzLmdldFZhbHVlKHRoaXMuZXhwcmVzc2lvblNlcnZpY2UsIHVuZGVmaW5lZCwgY29sRGVmLCB1bmRlZmluZWQsIGFwaSwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChjb2xEZWYuZGlzcGxheU5hbWUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiYWctZ3JpZDogRm91bmQgZGlzcGxheU5hbWUgXCIgKyBjb2xEZWYuZGlzcGxheU5hbWUgKyBcIiwgcGxlYXNlIHVzZSBoZWFkZXJOYW1lIGluc3RlYWQsIGRpc3BsYXlOYW1lIGlzIGRlcHJlY2F0ZWQuXCIpO1xuICAgICAgICByZXR1cm4gY29sRGVmLmRpc3BsYXlOYW1lO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjb2xEZWYuaGVhZGVyTmFtZTtcbiAgICB9XG59O1xuXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG59O1xuXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5maXJlQ29sdW1uc0NoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tpXS5jb2x1bW5zQ2hhbmdlZCh0aGlzLmFsbENvbHVtbnMsIHRoaXMuZ3JvdXBlZENvbHVtbnMpO1xuICAgIH1cbn07XG5cbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubW9kZWw7XG59O1xuXG4vLyBjYWxsZWQgYnkgYW5ndWxhckdyaWRcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLnNldENvbHVtbnMgPSBmdW5jdGlvbihjb2x1bW5EZWZzKSB7XG4gICAgdGhpcy5jaGVja0ZvckRlcHJlY2F0ZWRJdGVtcyhjb2x1bW5EZWZzKTtcbiAgICB0aGlzLmNyZWF0ZUNvbHVtbnMoY29sdW1uRGVmcyk7XG4gICAgdGhpcy5jcmVhdGVBZ2dDb2x1bW5zKCk7XG4gICAgdGhpcy51cGRhdGVNb2RlbCgpO1xuICAgIHRoaXMuZmlyZUNvbHVtbnNDaGFuZ2VkKCk7XG59O1xuXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5jaGVja0ZvckRlcHJlY2F0ZWRJdGVtcyA9IGZ1bmN0aW9uKGNvbHVtbkRlZnMpIHtcbiAgICBpZiAoY29sdW1uRGVmcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaTxjb2x1bW5EZWZzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY29sRGVmID0gY29sdW1uRGVmc1tpXTtcbiAgICAgICAgICAgIGlmIChjb2xEZWYuZ3JvdXAgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogJyArIGNvbERlZi5maWVsZCArICcgY29sRGVmLmdyb3VwIGlzIGRlcHJlY2F0ZWQsIHBsZWFzZSB1c2UgY29sRGVmLmhlYWRlckdyb3VwJyk7XG4gICAgICAgICAgICAgICAgY29sRGVmLmhlYWRlckdyb3VwID0gY29sRGVmLmdyb3VwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbERlZi5ncm91cFNob3cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogJyArIGNvbERlZi5maWVsZCArICcgY29sRGVmLmdyb3VwU2hvdyBpcyBkZXByZWNhdGVkLCBwbGVhc2UgdXNlIGNvbERlZi5oZWFkZXJHcm91cFNob3cnKTtcbiAgICAgICAgICAgICAgICBjb2xEZWYuaGVhZGVyR3JvdXBTaG93ID0gY29sRGVmLmdyb3VwU2hvdztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIGNhbGxlZCBieSBoZWFkZXJSZW5kZXJlciAtIHdoZW4gYSBoZWFkZXIgaXMgb3BlbmVkIG9yIGNsb3NlZFxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuaGVhZGVyR3JvdXBPcGVuZWQgPSBmdW5jdGlvbihncm91cCkge1xuICAgIHRoaXMuc2V0R3JvdXBPcGVuZWQoZ3JvdXAsICFncm91cC5leHBhbmRlZCk7XG59O1xuXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5zZXRHcm91cE9wZW5lZCA9IGZ1bmN0aW9uKGdyb3VwLCBvcGVuKSB7XG4gICAgZ3JvdXAuZXhwYW5kZWQgPSBvcGVuO1xuICAgIHRoaXMudXBkYXRlR3JvdXBzKCk7XG4gICAgdGhpcy51cGRhdGVEaXNwbGF5ZWRDb2x1bW5zKCk7XG4gICAgaWYgKHRoaXMuZ3JvdXBMaXN0ZW5lcikge1xuICAgICAgICB0aGlzLmdyb3VwTGlzdGVuZXIoZ3JvdXApO1xuICAgIH1cbiAgICB0aGlzLmFuZ3VsYXJHcmlkLnJlZnJlc2hIZWFkZXJBbmRCb2R5KCk7XG59O1xuXG4vLyBIQiBleHRlbnNpb25cbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLm9wZW5DbG9zZUFsbEhlYWRlckdyb3VwcyA9IGZ1bmN0aW9uKG9wZW4pIHtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5oZWFkZXJHcm91cHM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGdyb3Vwc1tpXS5leHBhbmRhYmxlKSB7XG4gICAgICAgICAgICBncm91cHNbaV0uZXhwYW5kZWQgPSBvcGVuO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMudXBkYXRlR3JvdXBzKCk7XG4gICAgdGhpcy51cGRhdGVEaXNwbGF5ZWRDb2x1bW5zKCk7XG4gICAgdGhpcy5hbmd1bGFyR3JpZC5yZWZyZXNoSGVhZGVyQW5kQm9keSgpO1xufTtcbi8vIG9sZGVyIG5hbWUgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLm9wZW5DbG9zZUFsbENvbHVtbkdyb3VwcyA9IENvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLm9wZW5DbG9zZUFsbEhlYWRlckdyb3VwcztcblxuLy8gSEIgZXh0ZW5zaW9uXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5vcGVuQ2xvc2VHcm91cEJ5TmFtZSA9IGZ1bmN0aW9uKG5hbWUsIG9wZW4pIHtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5jb2x1bW5Hcm91cHM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncm91cHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGdyb3Vwc1tpXS5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgICB0aGlzLnNldEdyb3VwT3BlbmVkKGdyb3Vwc1tpXSwgb3Blbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIEhCIGV4dGVuc2lvblxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUucmVnaXN0ZXJHcm91cExpc3RlbmVyID0gZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICB0aGlzLmdyb3VwTGlzdGVuZXIgPSBsaXN0ZW5lcjtcbn07XG5cbi8vIGNhbGxlZCBieSB0b29sUGFuZWwgLSB3aGVuIGNoYW5nZSBpbiBjb2x1bW5zIGhhcHBlbnNcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLm9uQ29sdW1uU3RhdGVDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy51cGRhdGVNb2RlbCgpO1xuICAgIHRoaXMuYW5ndWxhckdyaWQucmVmcmVzaEhlYWRlckFuZEJvZHkoKTtcbn07XG5cbi8vIGNhbGxlZCBmcm9tIEFQSVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuaGlkZUNvbHVtbnMgPSBmdW5jdGlvbihjb2xJZHMsIGhpZGUpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLmFsbENvbHVtbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGlkVGhpc0NvbCA9IHRoaXMuYWxsQ29sdW1uc1tpXS5jb2xJZDtcbiAgICAgICAgdmFyIGhpZGVUaGlzQ29sID0gY29sSWRzLmluZGV4T2YoaWRUaGlzQ29sKSA+PSAwO1xuICAgICAgICBpZiAoaGlkZVRoaXNDb2wpIHtcbiAgICAgICAgICAgIHRoaXMuYWxsQ29sdW1uc1tpXS52aXNpYmxlID0gIWhpZGU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5vbkNvbHVtblN0YXRlQ2hhbmdlZCgpO1xuICAgIHRoaXMuZmlyZUNvbHVtbnNDaGFuZ2VkKCk7IC8vIHRvIHRlbGwgdG9vbGJhclxufTtcblxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlTW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnVwZGF0ZVZpc2libGVDb2x1bW5zKCk7XG4gICAgdGhpcy51cGRhdGVQaW5uZWRDb2x1bW5zKCk7XG4gICAgdGhpcy5idWlsZEdyb3VwcygpO1xuICAgIHRoaXMudXBkYXRlR3JvdXBzKCk7XG4gICAgdGhpcy51cGRhdGVEaXNwbGF5ZWRDb2x1bW5zKCk7XG59O1xuXG4vLyBwcml2YXRlXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGVEaXNwbGF5ZWRDb2x1bW5zID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBIZWFkZXJzKCkpIHtcbiAgICAgICAgLy8gaWYgbm90IGdyb3VwaW5nIGJ5IGhlYWRlcnMsIHRoZW4gcHVsbCB2aXNpYmxlIGNvbHNcbiAgICAgICAgdGhpcy5kaXNwbGF5ZWRDb2x1bW5zID0gdGhpcy52aXNpYmxlQ29sdW1ucztcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiBncm91cGluZywgdGhlbiBvbmx5IHNob3cgY29sIGFzIHBlciBncm91cCBydWxlc1xuICAgICAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmhlYWRlckdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGdyb3VwID0gdGhpcy5oZWFkZXJHcm91cHNbaV07XG4gICAgICAgICAgICBncm91cC5hZGRUb1Zpc2libGVDb2x1bW5zKHRoaXMuZGlzcGxheWVkQ29sdW1ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbi8vIHB1YmxpYyAtIGNhbGxlZCBmcm9tIGFwaVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuc2l6ZUNvbHVtbnNUb0ZpdCA9IGZ1bmN0aW9uKGdyaWRXaWR0aCkge1xuICAgIC8vIGF2b2lkIGRpdmlkZSBieSB6ZXJvXG4gICAgaWYgKGdyaWRXaWR0aCA8PSAwIHx8IHRoaXMuZGlzcGxheWVkQ29sdW1ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb2x1bW5TdGFydFdpZHRoID0gMDsgLy8gd2lsbCBjb250YWluIHRoZSBzdGFydGluZyB0b3RhbCB3aWR0aCBvZiB0aGUgY29scyBiZWVuIHNwcmVhZFxuICAgIHZhciBjb2xzVG9TcHJlYWQgPSBbXTsgLy8gYWxsIHZpc2libGUgY29scywgZXhjZXB0IHRob3NlIHdpdGggYXZvaWRTaXplVG9GaXRcbiAgICB2YXIgd2lkdGhGb3JTcHJlYWRpbmcgPSBncmlkV2lkdGg7IC8vIGdyaWQgd2lkdGggbWludXMgdGhlIGNvbHVtbnMgd2UgYXJlIG5vdCByZXNpemluZ1xuXG4gICAgLy8gZ2V0IHRoZSBsaXN0IG9mIGNvbHMgdG8gd29yayB3aXRoXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmRpc3BsYXllZENvbHVtbnMubGVuZ3RoIDsgaisrKSB7XG4gICAgICAgIGlmICh0aGlzLmRpc3BsYXllZENvbHVtbnNbal0uY29sRGVmLnN1cHByZXNzU2l6ZVRvRml0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBkb24ndCBpbmNsdWRlIGNvbCwgYW5kIHJlbW92ZSB0aGUgd2lkdGggZnJvbSB0ZWggYXZhaWxhYmxlIHdpZHRoXG4gICAgICAgICAgICB3aWR0aEZvclNwcmVhZGluZyAtPSB0aGlzLmRpc3BsYXllZENvbHVtbnNbal0uYWN0dWFsV2lkdGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpbmNsdWRlIHRoZSBjb2xcbiAgICAgICAgICAgIGNvbHNUb1NwcmVhZC5wdXNoKHRoaXMuZGlzcGxheWVkQ29sdW1uc1tqXSk7XG4gICAgICAgICAgICBjb2x1bW5TdGFydFdpZHRoICs9IHRoaXMuZGlzcGxheWVkQ29sdW1uc1tqXS5hY3R1YWxXaWR0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIG5vIHdpZHRoIGxlZnQgb3ZlciB0byBzcHJlYWQgd2l0aCwgZG8gbm90aGluZ1xuICAgIGlmICh3aWR0aEZvclNwcmVhZGluZyA8PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2NhbGUgPSB3aWR0aEZvclNwcmVhZGluZyAvIGNvbHVtblN0YXJ0V2lkdGg7XG4gICAgdmFyIHBpeGVsc0Zvckxhc3RDb2wgPSB3aWR0aEZvclNwcmVhZGluZztcblxuICAgIC8vIHNpemUgYWxsIGNvbHMgZXhjZXB0IHRoZSBsYXN0IGJ5IHRoZSBzY2FsZVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgKGNvbHNUb1NwcmVhZC5sZW5ndGggLSAxKTsgaSsrKSB7XG4gICAgICAgIHZhciBjb2x1bW4gPSBjb2xzVG9TcHJlYWRbaV07XG4gICAgICAgIHZhciBuZXdXaWR0aCA9IHBhcnNlSW50KGNvbHVtbi5hY3R1YWxXaWR0aCAqIHNjYWxlKTtcbiAgICAgICAgY29sdW1uLmFjdHVhbFdpZHRoID0gbmV3V2lkdGg7XG4gICAgICAgIHBpeGVsc0Zvckxhc3RDb2wgLT0gbmV3V2lkdGg7XG4gICAgfVxuXG4gICAgLy8gc2l6ZSB0aGUgbGFzdCBieSB3aGF0cyByZW1haW5pbmcgKHRoaXMgYXZvaWRzIHJvdW5kaW5nIGVycm9ycyB0aGF0IGNvdWxkXG4gICAgLy8gb2NjdXIgd2l0aCBzY2FsaW5nIGV2ZXJ5dGhpbmcsIHdoZXJlIGl0IHJlc3VsdCBpbiBzb21lIHBpeGVscyBvZmYpXG4gICAgdmFyIGxhc3RDb2x1bW4gPSBjb2xzVG9TcHJlYWRbY29sc1RvU3ByZWFkLmxlbmd0aCAtIDFdO1xuICAgIGxhc3RDb2x1bW4uYWN0dWFsV2lkdGggPSBwaXhlbHNGb3JMYXN0Q29sO1xuXG4gICAgLy8gd2lkdGhzIHNldCwgcmVmcmVzaCB0aGUgZ3VpXG4gICAgdGhpcy5hbmd1bGFyR3JpZC5yZWZyZXNoSGVhZGVyQW5kQm9keSgpO1xufTtcblxuLy8gcHJpdmF0ZVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuYnVpbGRHcm91cHMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiBub3QgZ3JvdXBpbmcgYnkgaGVhZGVycywgZG8gbm90aGluZ1xuICAgIGlmICghdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cEhlYWRlcnMoKSkge1xuICAgICAgICB0aGlzLmhlYWRlckdyb3VwcyA9IG51bGw7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzcGxpdCB0aGUgY29sdW1ucyBpbnRvIGdyb3Vwc1xuICAgIHZhciBjdXJyZW50R3JvdXAgPSBudWxsO1xuICAgIHRoaXMuaGVhZGVyR3JvdXBzID0gW107XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgdmFyIGxhc3RDb2xXYXNQaW5uZWQgPSB0cnVlO1xuXG4gICAgdGhpcy52aXNpYmxlQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICAvLyBkbyB3ZSBuZWVkIGEgbmV3IGdyb3VwLCBiZWNhdXNlIHdlIG1vdmUgZnJvbSBwaW5uZWQgdG8gbm9uLXBpbm5lZCBjb2x1bW5zP1xuICAgICAgICB2YXIgZW5kT2ZQaW5uZWRIZWFkZXIgPSBsYXN0Q29sV2FzUGlubmVkICYmICFjb2x1bW4ucGlubmVkO1xuICAgICAgICBpZiAoIWNvbHVtbi5waW5uZWQpIHtcbiAgICAgICAgICAgIGxhc3RDb2xXYXNQaW5uZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBkbyB3ZSBuZWVkIGEgbmV3IGdyb3VwLCBiZWNhdXNlIHRoZSBncm91cCBuYW1lcyBkb2Vzbid0IG1hdGNoIGZyb20gcHJldmlvdXMgY29sP1xuICAgICAgICB2YXIgZ3JvdXBLZXlNaXNtYXRjaCA9IGN1cnJlbnRHcm91cCAmJiBjb2x1bW4uY29sRGVmLmhlYWRlckdyb3VwICE9PSBjdXJyZW50R3JvdXAubmFtZTtcbiAgICAgICAgLy8gd2UgZG9uJ3QgZ3JvdXAgY29sdW1ucyB3aGVyZSBubyBncm91cCBpcyBzcGVjaWZpZWRcbiAgICAgICAgdmFyIGNvbE5vdEluR3JvdXAgPSBjdXJyZW50R3JvdXAgJiYgIWN1cnJlbnRHcm91cC5uYW1lO1xuICAgICAgICAvLyBkbyB3ZSBuZWVkIGEgbmV3IGdyb3VwLCBiZWNhdXNlIHdlIGFyZSBqdXN0IHN0YXJ0aW5nXG4gICAgICAgIHZhciBwcm9jZXNzaW5nRmlyc3RDb2wgPSBjdXJyZW50R3JvdXAgPT09IG51bGw7XG4gICAgICAgIHZhciBuZXdHcm91cE5lZWRlZCA9IHByb2Nlc3NpbmdGaXJzdENvbCB8fCBlbmRPZlBpbm5lZEhlYWRlciB8fCBncm91cEtleU1pc21hdGNoIHx8IGNvbE5vdEluR3JvdXA7XG4gICAgICAgIC8vIGNyZWF0ZSBuZXcgZ3JvdXAsIGlmIGl0J3MgbmVlZGVkXG4gICAgICAgIGlmIChuZXdHcm91cE5lZWRlZCkge1xuICAgICAgICAgICAgdmFyIHBpbm5lZCA9IGNvbHVtbi5waW5uZWQ7XG4gICAgICAgICAgICBjdXJyZW50R3JvdXAgPSBuZXcgaGVhZGVyR3JvdXAocGlubmVkLCBjb2x1bW4uY29sRGVmLmhlYWRlckdyb3VwKTtcbiAgICAgICAgICAgIHRoYXQuaGVhZGVyR3JvdXBzLnB1c2goY3VycmVudEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50R3JvdXAuYWRkQ29sdW1uKGNvbHVtbik7XG4gICAgfSk7XG59O1xuXG4vLyBwcml2YXRlXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGVHcm91cHMgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBpZiBub3QgZ3JvdXBpbmcgYnkgaGVhZGVycywgZG8gbm90aGluZ1xuICAgIGlmICghdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cEhlYWRlcnMoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmhlYWRlckdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZ3JvdXAgPSB0aGlzLmhlYWRlckdyb3Vwc1tpXTtcbiAgICAgICAgZ3JvdXAuY2FsY3VsYXRlRXhwYW5kYWJsZSgpO1xuICAgICAgICBncm91cC5jYWxjdWxhdGVEaXNwbGF5ZWRDb2x1bW5zKCk7XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlVmlzaWJsZUNvbHVtbnMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZpc2libGVDb2x1bW5zID0gW107XG5cbiAgICB2YXIgbmVlZEFHcm91cENvbHVtbiA9IHRoaXMuZ3JvdXBlZENvbHVtbnMubGVuZ3RoID4gMFxuICAgICAgICAmJiAhdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFN1cHByZXNzQXV0b0NvbHVtbigpXG4gICAgICAgICYmICF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwVXNlRW50aXJlUm93KCk7XG5cbiAgICB2YXIgbG9jYWxlVGV4dEZ1bmMgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRMb2NhbGVUZXh0RnVuYygpO1xuXG4gICAgaWYgKG5lZWRBR3JvdXBDb2x1bW4pIHtcbiAgICAgICAgLy8gaWYgb25lIHByb3ZpZGVkIGJ5IHVzZXIsIHVzZSBpdCwgb3RoZXJ3aXNlIGNyZWF0ZSBvbmVcbiAgICAgICAgdmFyIGdyb3VwQ29sRGVmID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBDb2x1bW5EZWYoKTtcbiAgICAgICAgaWYgKCFncm91cENvbERlZikge1xuICAgICAgICAgICAgZ3JvdXBDb2xEZWYgPSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyTmFtZTogbG9jYWxlVGV4dEZ1bmMoJ2dyb3VwJywnR3JvdXAnKSxcbiAgICAgICAgICAgICAgICBjZWxsUmVuZGVyZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXI6IFwiZ3JvdXBcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm8gZ3JvdXAgY29sdW1uIHByb3ZpZGVkLCBuZWVkIHRvIGNyZWF0ZSBvbmUgaGVyZVxuICAgICAgICB2YXIgZ3JvdXBDb2x1bW4gPSBuZXcgQ29sdW1uKGdyb3VwQ29sRGVmLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb2xXaWR0aCgpKTtcbiAgICAgICAgdGhpcy52aXNpYmxlQ29sdW1ucy5wdXNoKGdyb3VwQ29sdW1uKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYWxsQ29sdW1ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5hbGxDb2x1bW5zW2ldO1xuICAgICAgICBpZiAoY29sdW1uLnZpc2libGUpIHtcbiAgICAgICAgICAgIGNvbHVtbi5pbmRleCA9IHRoaXMudmlzaWJsZUNvbHVtbnMubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy52aXNpYmxlQ29sdW1ucy5wdXNoKHRoaXMuYWxsQ29sdW1uc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBwcml2YXRlXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS51cGRhdGVQaW5uZWRDb2x1bW5zID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBpbm5lZENvbHVtbkNvdW50ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0UGlubmVkQ29sQ291bnQoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMudmlzaWJsZUNvbHVtbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHBpbm5lZCA9IGkgPCBwaW5uZWRDb2x1bW5Db3VudDtcbiAgICAgICAgdGhpcy52aXNpYmxlQ29sdW1uc1tpXS5waW5uZWQgPSBwaW5uZWQ7XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlQ29sdW1ucyA9IGZ1bmN0aW9uKGNvbHVtbkRlZnMpIHtcbiAgICB0aGlzLmFsbENvbHVtbnMgPSBbXTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKGNvbHVtbkRlZnMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5EZWZzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY29sRGVmID0gY29sdW1uRGVmc1tpXTtcbiAgICAgICAgICAgIC8vIHRoaXMgaXMgbWVzc3kgLSB3ZSBzd2FwIGluIGFub3RoZXIgY29sIGRlZiBpZiBpdCdzIGNoZWNrYm94IHNlbGVjdGlvbiAtIG5vdCBoYXBweSA6KFxuICAgICAgICAgICAgaWYgKGNvbERlZiA9PT0gJ2NoZWNrYm94U2VsZWN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbERlZiA9IHRoYXQuc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LmNyZWF0ZUNoZWNrYm94Q29sRGVmKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgd2lkdGggPSB0aGF0LmNhbGN1bGF0ZUNvbEluaXRpYWxXaWR0aChjb2xEZWYpO1xuICAgICAgICAgICAgdmFyIGNvbHVtbiA9IG5ldyBDb2x1bW4oY29sRGVmLCB3aWR0aCk7XG4gICAgICAgICAgICB0aGF0LmFsbENvbHVtbnMucHVzaChjb2x1bW4pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlQWdnQ29sdW1ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZ3JvdXBlZENvbHVtbnMgPSBbXTtcbiAgICB2YXIgZ3JvdXBLZXlzID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBLZXlzKCk7XG4gICAgaWYgKCFncm91cEtleXMgfHwgZ3JvdXBLZXlzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBncm91cEtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGdyb3VwS2V5ID0gZ3JvdXBLZXlzW2ldO1xuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5nZXRDb2x1bW4oZ3JvdXBLZXkpO1xuICAgICAgICBpZiAoIWNvbHVtbikge1xuICAgICAgICAgICAgY29sdW1uID0gdGhpcy5jcmVhdGVEdW1teUNvbHVtbihncm91cEtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ncm91cGVkQ29sdW1ucy5wdXNoKGNvbHVtbik7XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuQ29sdW1uQ29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlRHVtbXlDb2x1bW4gPSBmdW5jdGlvbihmaWVsZCkge1xuICAgIHZhciBjb2xEZWYgPSB7XG4gICAgICAgIGZpZWxkOiBmaWVsZCxcbiAgICAgICAgaGVhZGVyTmFtZTogZmllbGQsXG4gICAgICAgIGhpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgd2lkdGggPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb2xXaWR0aCgpO1xuICAgIHZhciBjb2x1bW4gPSBuZXcgQ29sdW1uKGNvbERlZiwgd2lkdGgpO1xuICAgIHJldHVybiBjb2x1bW47XG59O1xuXG4vLyBwcml2YXRlXG5Db2x1bW5Db250cm9sbGVyLnByb3RvdHlwZS5jYWxjdWxhdGVDb2xJbml0aWFsV2lkdGggPSBmdW5jdGlvbihjb2xEZWYpIHtcbiAgICBpZiAoIWNvbERlZi53aWR0aCkge1xuICAgICAgICAvLyBpZiBubyB3aWR0aCBkZWZpbmVkIGluIGNvbERlZiwgdXNlIGRlZmF1bHRcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbFdpZHRoKCk7XG4gICAgfSBlbHNlIGlmIChjb2xEZWYud2lkdGggPCBjb25zdGFudHMuTUlOX0NPTF9XSURUSCkge1xuICAgICAgICAvLyBpZiB3aWR0aCBpbiBjb2wgZGVmIHRvIHNtYWxsLCBzZXQgdG8gbWluIHdpZHRoXG4gICAgICAgIHJldHVybiBjb25zdGFudHMuTUlOX0NPTF9XSURUSDtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvdGhlcndpc2UgdXNlIHRoZSBwcm92aWRlZCB3aWR0aFxuICAgICAgICByZXR1cm4gY29sRGVmLndpZHRoO1xuICAgIH1cbn07XG5cbi8vIHByaXZhdGVcbi8vIGNhbGwgd2l0aCB0cnVlIChwaW5uZWQpLCBmYWxzZSAobm90LXBpbm5lZCkgb3IgdW5kZWZpbmVkIChhbGwgY29sdW1ucylcbkNvbHVtbkNvbnRyb2xsZXIucHJvdG90eXBlLmdldFRvdGFsQ29sV2lkdGggPSBmdW5jdGlvbihpbmNsdWRlUGlubmVkKSB7XG4gICAgdmFyIHdpZHRoU29GYXIgPSAwO1xuICAgIHZhciBwaW5lZE5vdEltcG9ydGFudCA9IHR5cGVvZiBpbmNsdWRlUGlubmVkICE9PSAnYm9vbGVhbic7XG5cbiAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgdmFyIGluY2x1ZGVUaGlzQ29sID0gcGluZWROb3RJbXBvcnRhbnQgfHwgY29sdW1uLnBpbm5lZCA9PT0gaW5jbHVkZVBpbm5lZDtcbiAgICAgICAgaWYgKGluY2x1ZGVUaGlzQ29sKSB7XG4gICAgICAgICAgICB3aWR0aFNvRmFyICs9IGNvbHVtbi5hY3R1YWxXaWR0aDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHdpZHRoU29GYXI7XG59O1xuXG5mdW5jdGlvbiBoZWFkZXJHcm91cChwaW5uZWQsIG5hbWUpIHtcbiAgICB0aGlzLnBpbm5lZCA9IHBpbm5lZDtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuYWxsQ29sdW1ucyA9IFtdO1xuICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucyA9IFtdO1xuICAgIHRoaXMuZXhwYW5kYWJsZSA9IGZhbHNlOyAvLyB3aGV0aGVyIHRoaXMgZ3JvdXAgY2FuIGJlIGV4cGFuZGVkIG9yIG5vdFxuICAgIHRoaXMuZXhwYW5kZWQgPSBmYWxzZTtcbn1cblxuaGVhZGVyR3JvdXAucHJvdG90eXBlLmFkZENvbHVtbiA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgIHRoaXMuYWxsQ29sdW1ucy5wdXNoKGNvbHVtbik7XG59O1xuXG4vLyBuZWVkIHRvIGNoZWNrIHRoYXQgdGhpcyBncm91cCBoYXMgYXQgbGVhc3Qgb25lIGNvbCBzaG93aW5nIHdoZW4gYm90aCBleHBhbmRlZCBhbmQgY29udHJhY3RlZC5cbi8vIGlmIG5vdCwgdGhlbiB3ZSBkb24ndCBhbGxvdyBleHBhbmRpbmcgYW5kIGNvbnRyYWN0aW5nIG9uIHRoaXMgZ3JvdXBcbmhlYWRlckdyb3VwLnByb3RvdHlwZS5jYWxjdWxhdGVFeHBhbmRhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gd2FudCB0byBtYWtlIHN1cmUgdGhlIGdyb3VwIGRvZXNuJ3QgZGlzYXBwZWFyIHdoZW4gaXQncyBvcGVuXG4gICAgdmFyIGF0TGVhc3RPbmVTaG93aW5nV2hlbk9wZW4gPSBmYWxzZTtcbiAgICAvLyB3YW50IHRvIG1ha2Ugc3VyZSB0aGUgZ3JvdXAgZG9lc24ndCBkaXNhcHBlYXIgd2hlbiBpdCdzIGNsb3NlZFxuICAgIHZhciBhdExlYXN0T25lU2hvd2luZ1doZW5DbG9zZWQgPSBmYWxzZTtcbiAgICAvLyB3YW50IHRvIG1ha2Ugc3VyZSB0aGUgZ3JvdXAgaGFzIHNvbWV0aGluZyB0byBzaG93IC8gaGlkZVxuICAgIHZhciBhdExlYXN0T25lQ2hhbmdlYWJsZSA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwLCBqID0gdGhpcy5hbGxDb2x1bW5zLmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5hbGxDb2x1bW5zW2ldO1xuICAgICAgICBpZiAoY29sdW1uLmNvbERlZi5oZWFkZXJHcm91cFNob3cgPT09ICdvcGVuJykge1xuICAgICAgICAgICAgYXRMZWFzdE9uZVNob3dpbmdXaGVuT3BlbiA9IHRydWU7XG4gICAgICAgICAgICBhdExlYXN0T25lQ2hhbmdlYWJsZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoY29sdW1uLmNvbERlZi5oZWFkZXJHcm91cFNob3cgPT09ICdjbG9zZWQnKSB7XG4gICAgICAgICAgICBhdExlYXN0T25lU2hvd2luZ1doZW5DbG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgYXRMZWFzdE9uZUNoYW5nZWFibGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXRMZWFzdE9uZVNob3dpbmdXaGVuT3BlbiA9IHRydWU7XG4gICAgICAgICAgICBhdExlYXN0T25lU2hvd2luZ1doZW5DbG9zZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5leHBhbmRhYmxlID0gYXRMZWFzdE9uZVNob3dpbmdXaGVuT3BlbiAmJiBhdExlYXN0T25lU2hvd2luZ1doZW5DbG9zZWQgJiYgYXRMZWFzdE9uZUNoYW5nZWFibGU7XG59O1xuXG5oZWFkZXJHcm91cC5wcm90b3R5cGUuY2FsY3VsYXRlRGlzcGxheWVkQ29sdW1ucyA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGNsZWFyIG91dCBsYXN0IHRpbWUgd2UgY2FsY3VsYXRlZFxuICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucyA9IFtdO1xuICAgIC8vIGl0IG5vdCBleHBhbmRhYmxlLCBldmVyeXRoaW5nIGlzIHZpc2libGVcbiAgICBpZiAoIXRoaXMuZXhwYW5kYWJsZSkge1xuICAgICAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMgPSB0aGlzLmFsbENvbHVtbnM7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gYW5kIGNhbGN1bGF0ZSBhZ2FpblxuICAgIGZvciAodmFyIGkgPSAwLCBqID0gdGhpcy5hbGxDb2x1bW5zLmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5hbGxDb2x1bW5zW2ldO1xuICAgICAgICBzd2l0Y2ggKGNvbHVtbi5jb2xEZWYuaGVhZGVyR3JvdXBTaG93KSB7XG4gICAgICAgICAgICBjYXNlICdvcGVuJzpcbiAgICAgICAgICAgICAgICAvLyB3aGVuIHNldCB0byBvcGVuLCBvbmx5IHNob3cgY29sIGlmIGdyb3VwIGlzIG9wZW5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5leHBhbmRlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Nsb3NlZCc6XG4gICAgICAgICAgICAgICAgLy8gd2hlbiBzZXQgdG8gb3Blbiwgb25seSBzaG93IGNvbCBpZiBncm91cCBpcyBvcGVuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmV4cGFuZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheWVkQ29sdW1ucy5wdXNoKGNvbHVtbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0IGlzIGFsd2F5cyBzaG93IHRoZSBjb2x1bW5cbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXllZENvbHVtbnMucHVzaChjb2x1bW4pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gc2hvdWxkIHJlcGxhY2Ugd2l0aCB1dGlscyBtZXRob2QgJ2FkZCBhbGwnXG5oZWFkZXJHcm91cC5wcm90b3R5cGUuYWRkVG9WaXNpYmxlQ29sdW1ucyA9IGZ1bmN0aW9uKGNvbHNUb0FkZCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kaXNwbGF5ZWRDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb2x1bW4gPSB0aGlzLmRpc3BsYXllZENvbHVtbnNbaV07XG4gICAgICAgIGNvbHNUb0FkZC5wdXNoKGNvbHVtbik7XG4gICAgfVxufTtcblxudmFyIGNvbElkU2VxdWVuY2UgPSAwO1xuXG5mdW5jdGlvbiBDb2x1bW4oY29sRGVmLCBhY3R1YWxXaWR0aCwgaGlkZSkge1xuICAgIHRoaXMuY29sRGVmID0gY29sRGVmO1xuICAgIHRoaXMuYWN0dWFsV2lkdGggPSBhY3R1YWxXaWR0aDtcbiAgICB0aGlzLnZpc2libGUgPSAhY29sRGVmLmhpZGU7XG4gICAgLy8gaW4gdGhlIGZ1dHVyZSwgdGhlIGNvbEtleSBtaWdodCBiZSBzb21ldGhpbmcgb3RoZXIgdGhhbiB0aGUgaW5kZXhcbiAgICBpZiAoY29sRGVmLmNvbElkKSB7XG4gICAgICAgIHRoaXMuY29sSWQgPSBjb2xEZWYuY29sSWQ7XG4gICAgfWVsc2UgaWYgKGNvbERlZi5maWVsZCkge1xuICAgICAgICB0aGlzLmNvbElkID0gY29sRGVmLmZpZWxkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29sSWQgPSAnJyArIGNvbElkU2VxdWVuY2UrKztcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uQ29udHJvbGxlcjtcbiIsInZhciBjb25zdGFudHMgPSB7XG4gICAgU1RFUF9FVkVSWVRISU5HOiAwLFxuICAgIFNURVBfRklMVEVSOiAxLFxuICAgIFNURVBfU09SVDogMixcbiAgICBTVEVQX01BUDogMyxcbiAgICBBU0M6IFwiYXNjXCIsXG4gICAgREVTQzogXCJkZXNjXCIsXG4gICAgUk9XX0JVRkZFUl9TSVpFOiAyMCxcbiAgICBTT1JUX1NUWUxFX1NIT1c6IFwiZGlzcGxheTppbmxpbmU7XCIsXG4gICAgU09SVF9TVFlMRV9ISURFOiBcImRpc3BsYXk6bm9uZTtcIixcbiAgICBNSU5fQ09MX1dJRFRIOiAxMCxcblxuICAgIEtFWV9UQUI6IDksXG4gICAgS0VZX0VOVEVSOiAxMyxcbiAgICBLRVlfU1BBQ0U6IDMyLFxuICAgIEtFWV9ET1dOOiA0MCxcbiAgICBLRVlfVVA6IDM4LFxuICAgIEtFWV9MRUZUOiAzNyxcbiAgICBLRVlfUklHSFQ6IDM5XG59O1xuXG4vLyB0YWtlbiBmcm9tIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvOTg0NzU4MC9ob3ctdG8tZGV0ZWN0LXNhZmFyaS1jaHJvbWUtaWUtZmlyZWZveC1hbmQtb3BlcmEtYnJvd3NlclxudmFyIGlzT3BlcmEgPSAhIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMDtcbi8vIE9wZXJhIDguMCsgKFVBIGRldGVjdGlvbiB0byBkZXRlY3QgQmxpbmsvdjgtcG93ZXJlZCBPcGVyYSlcbnZhciBpc0ZpcmVmb3ggPSB0eXBlb2YgSW5zdGFsbFRyaWdnZXIgIT09ICd1bmRlZmluZWQnOyAgIC8vIEZpcmVmb3ggMS4wK1xudmFyIGlzU2FmYXJpID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDA7XG4vLyBBdCBsZWFzdCBTYWZhcmkgMys6IFwiW29iamVjdCBIVE1MRWxlbWVudENvbnN0cnVjdG9yXVwiXG52YXIgaXNDaHJvbWUgPSAhIXdpbmRvdy5jaHJvbWUgJiYgIXRoaXMuaXNPcGVyYTsgLy8gQ2hyb21lIDErXG52YXIgaXNJRSA9IC8qQGNjX29uIUAqL2ZhbHNlIHx8ICEhZG9jdW1lbnQuZG9jdW1lbnRNb2RlOyAvLyBBdCBsZWFzdCBJRTZcblxuaWYgKGlzT3BlcmEpIHtcbiAgICBjb25zdGFudHMuQlJPV1NFUiA9ICdvcGVyYSc7XG59IGVsc2UgaWYgKGlzRmlyZWZveCkge1xuICAgIGNvbnN0YW50cy5CUk9XU0VSID0gJ2ZpcmVmb3gnO1xufSBlbHNlIGlmIChpc1NhZmFyaSkge1xuICAgIGNvbnN0YW50cy5CUk9XU0VSID0gJ3NhZmFyaSc7XG59IGVsc2UgaWYgKGlzQ2hyb21lKSB7XG4gICAgY29uc3RhbnRzLkJST1dTRVIgPSAnY2hyb21lJztcbn0gZWxzZSBpZiAoaXNJRSkge1xuICAgIGNvbnN0YW50cy5CUk9XU0VSID0gJ2llJztcbn1cblxudmFyIGlzTWFjID0gbmF2aWdhdG9yLnBsYXRmb3JtLnRvVXBwZXJDYXNlKCkuaW5kZXhPZignTUFDJyk+PTA7XG52YXIgaXNXaW5kb3dzID0gbmF2aWdhdG9yLnBsYXRmb3JtLnRvVXBwZXJDYXNlKCkuaW5kZXhPZignV0lOJyk+PTA7XG5pZiAoaXNNYWMpIHtcbiAgICBjb25zdGFudHMuUExBVEZPUk0gPSAnbWFjJztcbn0gZWxzZSBpZiAoaXNXaW5kb3dzKSB7XG4gICAgY29uc3RhbnRzLlBMQVRGT1JNID0gJ3dpbic7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29uc3RhbnRzO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gRHJhZ0FuZERyb3BTZXJ2aWNlKCkge1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLnN0b3BEcmFnZ2luZy5iaW5kKHRoaXMpKTtcbn1cblxuRHJhZ0FuZERyb3BTZXJ2aWNlLnByb3RvdHlwZS5zdG9wRHJhZ2dpbmcgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kcmFnSXRlbSkge1xuICAgICAgICB0aGlzLnNldERyYWdDc3NDbGFzc2VzKHRoaXMuZHJhZ0l0ZW0uZURyYWdTb3VyY2UsIGZhbHNlKTtcbiAgICAgICAgdGhpcy5kcmFnSXRlbSA9IG51bGw7XG4gICAgfVxufTtcblxuRHJhZ0FuZERyb3BTZXJ2aWNlLnByb3RvdHlwZS5zZXREcmFnQ3NzQ2xhc3NlcyA9IGZ1bmN0aW9uKGVMaXN0SXRlbSwgZHJhZ2dpbmcpIHtcbiAgICB1dGlscy5hZGRPclJlbW92ZUNzc0NsYXNzKGVMaXN0SXRlbSwgJ2FnLWRyYWdnaW5nJywgZHJhZ2dpbmcpO1xuICAgIHV0aWxzLmFkZE9yUmVtb3ZlQ3NzQ2xhc3MoZUxpc3RJdGVtLCAnYWctbm90LWRyYWdnaW5nJywgIWRyYWdnaW5nKTtcbn07XG5cbkRyYWdBbmREcm9wU2VydmljZS5wcm90b3R5cGUuYWRkRHJhZ1NvdXJjZSA9IGZ1bmN0aW9uKGVEcmFnU291cmNlLCBkcmFnU291cmNlQ2FsbGJhY2ssIGNvbnRhaW5lcklkKSB7XG5cbiAgICB0aGlzLnNldERyYWdDc3NDbGFzc2VzKGVEcmFnU291cmNlLCBmYWxzZSk7XG5cbiAgICB2YXIgbW91c2VEb3duID0gZmFsc2U7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgZURyYWdTb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vdXNlRG93biA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBlRHJhZ1NvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIG1vdXNlRG93biA9IGZhbHNlO1xuICAgIH0pO1xuXG4gICAgZURyYWdTb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgbW91c2VEb3duID0gZmFsc2U7XG4gICAgfSk7XG5cbiAgICBlRHJhZ1NvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKG1vdXNlRG93bikge1xuICAgICAgICAgICAgdmFyIGFscmVhZHlEcmFnZ2luZ1RoaXNJdGVtID0gdGhpcy5kcmFnSXRlbSAmJiB0aGlzLmRyYWdJdGVtLmVEcm9wU291cmNlID09PSBlRHJhZ1NvdXJjZTtcbiAgICAgICAgICAgIGlmICghYWxyZWFkeURyYWdnaW5nVGhpc0l0ZW0pIHtcbiAgICAgICAgICAgICAgICB0aGF0LnN0YXJ0RHJhZ2dpbmcoZURyYWdTb3VyY2UsIGRyYWdTb3VyY2VDYWxsYmFjaywgY29udGFpbmVySWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5EcmFnQW5kRHJvcFNlcnZpY2UucHJvdG90eXBlLnN0YXJ0RHJhZ2dpbmcgPSBmdW5jdGlvbihlRHJhZ1NvdXJjZSwgZHJhZ1NvdXJjZUNhbGxiYWNrKSB7XG4gICAgaWYgKHRoaXMuZHJhZ0l0ZW0gJiYgdGhpcy5kcmFnSXRlbS5lRHJhZ1NvdXJjZSA9PT0gZURyYWdTb3VyY2UpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5kcmFnSXRlbSkge1xuICAgICAgICB0aGlzLnN0b3BEcmFnZ2luZygpO1xuICAgIH1cbiAgICB2YXIgZGF0YTtcbiAgICBpZiAoZHJhZ1NvdXJjZUNhbGxiYWNrLmdldERhdGEpIHtcbiAgICAgICAgZGF0YSA9IGRyYWdTb3VyY2VDYWxsYmFjay5nZXREYXRhKCk7XG4gICAgfVxuICAgIHZhciBjb250YWluZXJJZDtcbiAgICBpZiAoZHJhZ1NvdXJjZUNhbGxiYWNrLmdldENvbnRhaW5lcklkKSB7XG4gICAgICAgIGNvbnRhaW5lcklkID0gZHJhZ1NvdXJjZUNhbGxiYWNrLmdldENvbnRhaW5lcklkKCk7XG4gICAgfVxuXG4gICAgdGhpcy5kcmFnSXRlbSA9IHtcbiAgICAgICAgZURyYWdTb3VyY2U6IGVEcmFnU291cmNlLFxuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBjb250YWluZXJJZDogY29udGFpbmVySWRcbiAgICB9O1xuICAgIHRoaXMuc2V0RHJhZ0Nzc0NsYXNzZXModGhpcy5kcmFnSXRlbS5lRHJhZ1NvdXJjZSwgdHJ1ZSk7XG59O1xuXG5EcmFnQW5kRHJvcFNlcnZpY2UucHJvdG90eXBlLmFkZERyb3BUYXJnZXQgPSBmdW5jdGlvbihlRHJvcFRhcmdldCwgZHJvcFRhcmdldENhbGxiYWNrKSB7XG4gICAgdmFyIG1vdXNlSW4gPSBmYWxzZTtcbiAgICB2YXIgYWNjZXB0RHJhZyA9IGZhbHNlO1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIGVEcm9wVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIW1vdXNlSW4pIHtcbiAgICAgICAgICAgIG1vdXNlSW4gPSB0cnVlO1xuICAgICAgICAgICAgaWYgKHRoYXQuZHJhZ0l0ZW0pIHtcbiAgICAgICAgICAgICAgICBhY2NlcHREcmFnID0gZHJvcFRhcmdldENhbGxiYWNrLmFjY2VwdERyYWcodGhhdC5kcmFnSXRlbSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFjY2VwdERyYWcgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZURyb3BUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGFjY2VwdERyYWcpIHtcbiAgICAgICAgICAgIGRyb3BUYXJnZXRDYWxsYmFjay5ub0Ryb3AoKTtcbiAgICAgICAgfVxuICAgICAgICBtb3VzZUluID0gZmFsc2U7XG4gICAgICAgIGFjY2VwdERyYWcgPSBmYWxzZTtcbiAgICB9KTtcblxuICAgIGVEcm9wVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gZHJhZ0l0ZW0gc2hvdWxkIG5ldmVyIGJlIG51bGwsIGNoZWNraW5nIGp1c3QgaW4gY2FzZVxuICAgICAgICBpZiAoYWNjZXB0RHJhZyAmJiB0aGF0LmRyYWdJdGVtKSB7XG4gICAgICAgICAgICBkcm9wVGFyZ2V0Q2FsbGJhY2suZHJvcCh0aGF0LmRyYWdJdGVtKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBEcmFnQW5kRHJvcFNlcnZpY2UoKTsiLCJmdW5jdGlvbiBFeHByZXNzaW9uU2VydmljZSgpIHt9XG5cbkV4cHJlc3Npb25TZXJ2aWNlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uKHJ1bGUsIHBhcmFtcykge1xufTtcblxuZnVuY3Rpb24gRXhwcmVzc2lvblNlcnZpY2UoKSB7XG4gICAgdGhpcy5leHByZXNzaW9uVG9GdW5jdGlvbkNhY2hlID0ge307XG59XG5cbkV4cHJlc3Npb25TZXJ2aWNlLnByb3RvdHlwZS5ldmFsdWF0ZSA9IGZ1bmN0aW9uIChleHByZXNzaW9uLCBwYXJhbXMpIHtcblxuICAgIHRyeSB7XG4gICAgICAgIHZhciBqYXZhU2NyaXB0RnVuY3Rpb24gPSB0aGlzLmNyZWF0ZUV4cHJlc3Npb25GdW5jdGlvbihleHByZXNzaW9uKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGphdmFTY3JpcHRGdW5jdGlvbihwYXJhbXMudmFsdWUsIHBhcmFtcy5jb250ZXh0LCBwYXJhbXMubm9kZSxcbiAgICAgICAgICAgIHBhcmFtcy5kYXRhLCBwYXJhbXMuY29sRGVmLCBwYXJhbXMucm93SW5kZXgsIHBhcmFtcy5hcGkpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gdGhlIGV4cHJlc3Npb24gZmFpbGVkLCB3aGljaCBjYW4gaGFwcGVuLCBhcyBpdCdzIHRoZSBjbGllbnQgdGhhdFxuICAgICAgICAvLyBwcm92aWRlcyB0aGUgZXhwcmVzc2lvbi4gc28gcHJpbnQgYSBuaWNlIG1lc3NhZ2VcbiAgICAgICAgY29uc29sZS5lcnJvcignUHJvY2Vzc2luZyBvZiB0aGUgZXhwcmVzc2lvbiBmYWlsZWQnKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXhwcmVzc2lvbiA9ICcgKyBleHByZXNzaW9uKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXhjZXB0aW9uID0gJyArIGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59O1xuXG5FeHByZXNzaW9uU2VydmljZS5wcm90b3R5cGUuY3JlYXRlRXhwcmVzc2lvbkZ1bmN0aW9uID0gZnVuY3Rpb24gKGV4cHJlc3Npb24pIHtcbiAgICAvLyBjaGVjayBjYWNoZSBmaXJzdFxuICAgIGlmICh0aGlzLmV4cHJlc3Npb25Ub0Z1bmN0aW9uQ2FjaGVbZXhwcmVzc2lvbl0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXhwcmVzc2lvblRvRnVuY3Rpb25DYWNoZVtleHByZXNzaW9uXTtcbiAgICB9XG4gICAgLy8gaWYgbm90IGZvdW5kIGluIGNhY2hlLCByZXR1cm4gdGhlIGZ1bmN0aW9uXG4gICAgdmFyIGZ1bmN0aW9uQm9keSA9IHRoaXMuY3JlYXRlRnVuY3Rpb25Cb2R5KGV4cHJlc3Npb24pO1xuICAgIHZhciB0aGVGdW5jdGlvbiA9IG5ldyBGdW5jdGlvbigneCwgY3R4LCBub2RlLCBkYXRhLCBjb2xEZWYsIHJvd0luZGV4LCBhcGknLCBmdW5jdGlvbkJvZHkpO1xuXG4gICAgLy8gc3RvcmUgaW4gY2FjaGVcbiAgICB0aGlzLmV4cHJlc3Npb25Ub0Z1bmN0aW9uQ2FjaGVbZXhwcmVzc2lvbl0gPSB0aGVGdW5jdGlvbjtcblxuICAgIHJldHVybiB0aGVGdW5jdGlvbjtcbn07XG5cbkV4cHJlc3Npb25TZXJ2aWNlLnByb3RvdHlwZS5jcmVhdGVGdW5jdGlvbkJvZHkgPSBmdW5jdGlvbiAoZXhwcmVzc2lvbikge1xuICAgIC8vIGlmIHRoZSBleHByZXNzaW9uIGhhcyB0aGUgJ3JldHVybicgd29yZCBpbiBpdCwgdGhlbiB1c2UgYXMgaXMsXG4gICAgLy8gaWYgbm90LCB0aGVuIHdyYXAgaXQgd2l0aCByZXR1cm4gYW5kICc7JyB0byBtYWtlIGEgZnVuY3Rpb25cbiAgICBpZiAoZXhwcmVzc2lvbi5pbmRleE9mKCdyZXR1cm4nKSA+PSAwKSB7XG4gICAgICAgIHJldHVybiBleHByZXNzaW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAncmV0dXJuICcgKyBleHByZXNzaW9uICsgJzsnO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXhwcmVzc2lvblNlcnZpY2U7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgU2V0RmlsdGVyID0gcmVxdWlyZSgnLi9zZXRGaWx0ZXInKTtcbnZhciBOdW1iZXJGaWx0ZXIgPSByZXF1aXJlKCcuL251bWJlckZpbHRlcicpO1xudmFyIFN0cmluZ0ZpbHRlciA9IHJlcXVpcmUoJy4vdGV4dEZpbHRlcicpO1xuXG5mdW5jdGlvbiBGaWx0ZXJNYW5hZ2VyKCkge31cblxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGdyaWQsIGdyaWRPcHRpb25zV3JhcHBlciwgJGNvbXBpbGUsICRzY29wZSwgZXhwcmVzc2lvblNlcnZpY2UsIGNvbHVtbk1vZGVsKSB7XG4gICAgdGhpcy4kY29tcGlsZSA9ICRjb21waWxlO1xuICAgIHRoaXMuJHNjb3BlID0gJHNjb3BlO1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xuICAgIHRoaXMuZ3JpZCA9IGdyaWQ7XG4gICAgdGhpcy5hbGxGaWx0ZXJzID0ge307XG4gICAgdGhpcy5leHByZXNzaW9uU2VydmljZSA9IGV4cHJlc3Npb25TZXJ2aWNlO1xuICAgIHRoaXMuY29sdW1uTW9kZWwgPSBjb2x1bW5Nb2RlbDtcbn07XG5cbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLnNldEZpbHRlck1vZGVsID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKG1vZGVsKSB7XG4gICAgICAgIC8vIG1hcmsgdGhlIGZpbHRlcnMgYXMgd2Ugc2V0IHRoZW0sIHNvIGFueSBhY3RpdmUgZmlsdGVycyBsZWZ0IG92ZXIgd2Ugc3RvcFxuICAgICAgICB2YXIgcHJvY2Vzc2VkRmllbGRzID0gT2JqZWN0LmtleXMobW9kZWwpO1xuICAgICAgICB1dGlscy5pdGVyYXRlT2JqZWN0KHRoaXMuYWxsRmlsdGVycywgZnVuY3Rpb24oa2V5LCBmaWx0ZXJXcmFwcGVyKSB7XG4gICAgICAgICAgICB2YXIgZmllbGQgPSBmaWx0ZXJXcmFwcGVyLmNvbHVtbi5jb2xEZWYuZmllbGQ7XG4gICAgICAgICAgICB1dGlscy5yZW1vdmVGcm9tQXJyYXkocHJvY2Vzc2VkRmllbGRzLCBmaWVsZCk7XG4gICAgICAgICAgICBpZiAoZmllbGQpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3TW9kZWwgPSBtb2RlbFtmaWVsZF07XG4gICAgICAgICAgICAgICAgdGhhdC5zZXRNb2RlbE9uRmlsdGVyV3JhcHBlcihmaWx0ZXJXcmFwcGVyLmZpbHRlciwgbmV3TW9kZWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIG5vIGZpZWxkIGZvdW5kIGZvciBjb2x1bW4gd2hpbGUgZG9pbmcgc2V0RmlsdGVyTW9kZWwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGF0IHRoaXMgcG9pbnQsIHByb2Nlc3NlZEZpZWxkcyBjb250YWlucyBkYXRhIGZvciB3aGljaCB3ZSBkb24ndCBoYXZlIGEgZmlsdGVyIHdvcmtpbmcgeWV0XG4gICAgICAgIHV0aWxzLml0ZXJhdGVBcnJheShwcm9jZXNzZWRGaWVsZHMsIGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgICAgICAgICB2YXIgY29sdW1uID0gdGhhdC5jb2x1bW5Nb2RlbC5nZXRDb2x1bW4oZmllbGQpO1xuICAgICAgICAgICAgaWYgKCFjb2x1bW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIG5vIGNvbHVtbiBmb3VuZCBmb3IgZmllbGQgJyArIGZpZWxkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZmlsdGVyV3JhcHBlciA9IHRoYXQuZ2V0T3JDcmVhdGVGaWx0ZXJXcmFwcGVyKGNvbHVtbik7XG4gICAgICAgICAgICB0aGF0LnNldE1vZGVsT25GaWx0ZXJXcmFwcGVyKGZpbHRlcldyYXBwZXIuZmlsdGVyLCBtb2RlbFtmaWVsZF0pO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB1dGlscy5pdGVyYXRlT2JqZWN0KHRoaXMuYWxsRmlsdGVycywgZnVuY3Rpb24oa2V5LCBmaWx0ZXJXcmFwcGVyKSB7XG4gICAgICAgICAgICB0aGF0LnNldE1vZGVsT25GaWx0ZXJXcmFwcGVyKGZpbHRlcldyYXBwZXIuZmlsdGVyLCBudWxsKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuc2V0TW9kZWxPbkZpbHRlcldyYXBwZXIgPSBmdW5jdGlvbihmaWx0ZXIsIG5ld01vZGVsKSB7XG4gICAgLy8gYmVjYXVzZSB1c2VyIGNhbiBwcm92aWRlIGZpbHRlcnMsIHdlIHByb3ZpZGUgdXNlZnVsIGVycm9yIGNoZWNraW5nIGFuZCBtZXNzYWdlc1xuICAgIGlmICh0eXBlb2YgZmlsdGVyLmdldEFwaSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIGZpbHRlciBtaXNzaW5nIGdldEFwaSBtZXRob2QsIHdoaWNoIGlzIG5lZWRlZCBmb3IgZ2V0RmlsdGVyTW9kZWwnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZmlsdGVyQXBpID0gZmlsdGVyLmdldEFwaSgpO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyQXBpLnNldE1vZGVsICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignV2FybmluZyBhZy1ncmlkIC0gZmlsdGVyIEFQSSBtaXNzaW5nIHNldE1vZGVsIG1ldGhvZCwgd2hpY2ggaXMgbmVlZGVkIGZvciBzZXRGaWx0ZXJNb2RlbCcpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZpbHRlckFwaS5zZXRNb2RlbChuZXdNb2RlbCk7XG59O1xuXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5nZXRGaWx0ZXJNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB1dGlscy5pdGVyYXRlT2JqZWN0KHRoaXMuYWxsRmlsdGVycywgZnVuY3Rpb24oa2V5LCBmaWx0ZXJXcmFwcGVyKSB7XG4gICAgICAgIC8vIGJlY2F1c2UgdXNlciBjYW4gcHJvdmlkZSBmaWx0ZXJzLCB3ZSBwcm92aWRlIHVzZWZ1bCBlcnJvciBjaGVja2luZyBhbmQgbWVzc2FnZXNcbiAgICAgICAgaWYgKHR5cGVvZiBmaWx0ZXJXcmFwcGVyLmZpbHRlci5nZXRBcGkgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignV2FybmluZyBhZy1ncmlkIC0gZmlsdGVyIG1pc3NpbmcgZ2V0QXBpIG1ldGhvZCwgd2hpY2ggaXMgbmVlZGVkIGZvciBnZXRGaWx0ZXJNb2RlbCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmaWx0ZXJBcGkgPSBmaWx0ZXJXcmFwcGVyLmZpbHRlci5nZXRBcGkoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBmaWx0ZXJBcGkuZ2V0TW9kZWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignV2FybmluZyBhZy1ncmlkIC0gZmlsdGVyIEFQSSBtaXNzaW5nIGdldE1vZGVsIG1ldGhvZCwgd2hpY2ggaXMgbmVlZGVkIGZvciBnZXRGaWx0ZXJNb2RlbCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtb2RlbCA9IGZpbHRlckFwaS5nZXRNb2RlbCgpO1xuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICAgIHZhciBmaWVsZCA9IGZpbHRlcldyYXBwZXIuY29sdW1uLmNvbERlZi5maWVsZDtcbiAgICAgICAgICAgIGlmICghZmllbGQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1dhcm5pbmcgYWctZ3JpZCAtIGNhbm5vdCBnZXQgZmlsdGVyIG1vZGVsIHdoZW4gbm8gZmllbGQgdmFsdWUgcHJlc2VudCBmb3IgY29sdW1uJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtmaWVsZF0gPSBtb2RlbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5zZXRSb3dNb2RlbCA9IGZ1bmN0aW9uKHJvd01vZGVsKSB7XG4gICAgdGhpcy5yb3dNb2RlbCA9IHJvd01vZGVsO1xufTtcblxuLy8gcmV0dXJucyB0cnVlIGlmIGF0IGxlYXN0IG9uZSBmaWx0ZXIgaXMgYWN0aXZlXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5pc0ZpbHRlclByZXNlbnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXRMZWFzdE9uZUFjdGl2ZSA9IGZhbHNlO1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5hbGxGaWx0ZXJzKTtcbiAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBmaWx0ZXJXcmFwcGVyID0gdGhhdC5hbGxGaWx0ZXJzW2tleV07XG4gICAgICAgIGlmICghZmlsdGVyV3JhcHBlci5maWx0ZXIuaXNGaWx0ZXJBY3RpdmUpIHsgLy8gYmVjYXVzZSB1c2VycyBjYW4gZG8gY3VzdG9tIGZpbHRlcnMsIGdpdmUgbmljZSBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGaWx0ZXIgaXMgbWlzc2luZyBtZXRob2QgaXNGaWx0ZXJBY3RpdmUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsdGVyV3JhcHBlci5maWx0ZXIuaXNGaWx0ZXJBY3RpdmUoKSkge1xuICAgICAgICAgICAgYXRMZWFzdE9uZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYXRMZWFzdE9uZUFjdGl2ZTtcbn07XG5cbi8vIHJldHVybnMgdHJ1ZSBpZiBnaXZlbiBjb2wgaGFzIGEgZmlsdGVyIGFjdGl2ZVxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuaXNGaWx0ZXJQcmVzZW50Rm9yQ29sID0gZnVuY3Rpb24oY29sSWQpIHtcbiAgICB2YXIgZmlsdGVyV3JhcHBlciA9IHRoaXMuYWxsRmlsdGVyc1tjb2xJZF07XG4gICAgaWYgKCFmaWx0ZXJXcmFwcGVyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFmaWx0ZXJXcmFwcGVyLmZpbHRlci5pc0ZpbHRlckFjdGl2ZSkgeyAvLyBiZWNhdXNlIHVzZXJzIGNhbiBkbyBjdXN0b20gZmlsdGVycywgZ2l2ZSBuaWNlIGVycm9yIG1lc3NhZ2VcbiAgICAgICAgY29uc29sZS5lcnJvcignRmlsdGVyIGlzIG1pc3NpbmcgbWV0aG9kIGlzRmlsdGVyQWN0aXZlJyk7XG4gICAgfVxuICAgIHZhciBmaWx0ZXJQcmVzZW50ID0gZmlsdGVyV3JhcHBlci5maWx0ZXIuaXNGaWx0ZXJBY3RpdmUoKTtcbiAgICByZXR1cm4gZmlsdGVyUHJlc2VudDtcbn07XG5cbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmRvZXNGaWx0ZXJQYXNzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBkYXRhID0gbm9kZS5kYXRhO1xuICAgIHZhciBjb2xLZXlzID0gT2JqZWN0LmtleXModGhpcy5hbGxGaWx0ZXJzKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbEtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7IC8vIGNyaXRpY2FsIGNvZGUsIGRvbid0IHVzZSBmdW5jdGlvbmFsIHByb2dyYW1taW5nXG5cbiAgICAgICAgdmFyIGNvbElkID0gY29sS2V5c1tpXTtcbiAgICAgICAgdmFyIGZpbHRlcldyYXBwZXIgPSB0aGlzLmFsbEZpbHRlcnNbY29sSWRdO1xuXG4gICAgICAgIC8vIGlmIG5vIGZpbHRlciwgYWx3YXlzIHBhc3NcbiAgICAgICAgaWYgKGZpbHRlcldyYXBwZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWZpbHRlcldyYXBwZXIuZmlsdGVyLmRvZXNGaWx0ZXJQYXNzKSB7IC8vIGJlY2F1c2UgdXNlcnMgY2FuIGRvIGN1c3RvbSBmaWx0ZXJzLCBnaXZlIG5pY2UgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmlsdGVyIGlzIG1pc3NpbmcgbWV0aG9kIGRvZXNGaWx0ZXJQYXNzJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH07XG4gICAgICAgIGlmICghZmlsdGVyV3JhcHBlci5maWx0ZXIuZG9lc0ZpbHRlclBhc3MocGFyYW1zKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGFsbCBmaWx0ZXJzIHBhc3NlZFxuICAgIHJldHVybiB0cnVlO1xufTtcblxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUub25OZXdSb3dzTG9hZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIE9iamVjdC5rZXlzKHRoaXMuYWxsRmlsdGVycykuZm9yRWFjaChmdW5jdGlvbihmaWVsZCkge1xuICAgICAgICB2YXIgZmlsdGVyID0gdGhhdC5hbGxGaWx0ZXJzW2ZpZWxkXS5maWx0ZXI7XG4gICAgICAgIGlmIChmaWx0ZXIub25OZXdSb3dzTG9hZGVkKSB7XG4gICAgICAgICAgICBmaWx0ZXIub25OZXdSb3dzTG9hZGVkKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLnBvc2l0aW9uUG9wdXAgPSBmdW5jdGlvbihldmVudFNvdXJjZSwgZVBvcHVwLCBlUG9wdXBSb290KSB7XG4gICAgdmFyIHNvdXJjZVJlY3QgPSBldmVudFNvdXJjZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB2YXIgcGFyZW50UmVjdCA9IGVQb3B1cFJvb3QuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICB2YXIgeCA9IHNvdXJjZVJlY3QubGVmdCAtIHBhcmVudFJlY3QubGVmdDtcbiAgICB2YXIgeSA9IHNvdXJjZVJlY3QudG9wIC0gcGFyZW50UmVjdC50b3AgKyBzb3VyY2VSZWN0LmhlaWdodDtcblxuICAgIC8vIGlmIHBvcHVwIGlzIG92ZXJmbG93aW5nIHRvIHRoZSByaWdodCwgbW92ZSBpdCBsZWZ0XG4gICAgdmFyIHdpZHRoT2ZQb3B1cCA9IDIwMDsgLy8gdGhpcyBpcyBzZXQgaW4gdGhlIGNzc1xuICAgIHZhciB3aWR0aE9mUGFyZW50ID0gcGFyZW50UmVjdC5yaWdodCAtIHBhcmVudFJlY3QubGVmdDtcbiAgICB2YXIgbWF4WCA9IHdpZHRoT2ZQYXJlbnQgLSB3aWR0aE9mUG9wdXAgLSAyMDsgLy8gMjAgcGl4ZWxzIGdyYWNlXG4gICAgaWYgKHggPiBtYXhYKSB7IC8vIG1vdmUgcG9zaXRpb24gbGVmdCwgYmFjayBpbnRvIHZpZXdcbiAgICAgICAgeCA9IG1heFg7XG4gICAgfVxuICAgIGlmICh4IDwgMCkgeyAvLyBpbiBjYXNlIHRoZSBwb3B1cCBoYXMgYSBuZWdhdGl2ZSB2YWx1ZVxuICAgICAgICB4ID0gMDtcbiAgICB9XG5cbiAgICBlUG9wdXAuc3R5bGUubGVmdCA9IHggKyBcInB4XCI7XG4gICAgZVBvcHVwLnN0eWxlLnRvcCA9IHkgKyBcInB4XCI7XG59O1xuXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5jcmVhdGVWYWx1ZUdldHRlciA9IGZ1bmN0aW9uKGNvbERlZikge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICByZXR1cm4gZnVuY3Rpb24gdmFsdWVHZXR0ZXIobm9kZSkge1xuICAgICAgICB2YXIgYXBpID0gdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCk7XG4gICAgICAgIHZhciBjb250ZXh0ID0gdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpO1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUodGhhdC5leHByZXNzaW9uU2VydmljZSwgbm9kZS5kYXRhLCBjb2xEZWYsIG5vZGUsIGFwaSwgY29udGV4dCk7XG4gICAgfTtcbn07XG5cbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmdldEZpbHRlckFwaSA9IGZ1bmN0aW9uKGNvbHVtbikge1xuICAgIHZhciBmaWx0ZXJXcmFwcGVyID0gdGhpcy5nZXRPckNyZWF0ZUZpbHRlcldyYXBwZXIoY29sdW1uKTtcbiAgICBpZiAoZmlsdGVyV3JhcHBlcikge1xuICAgICAgICBpZiAodHlwZW9mIGZpbHRlcldyYXBwZXIuZmlsdGVyLmdldEFwaSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlcldyYXBwZXIuZmlsdGVyLmdldEFwaSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuRmlsdGVyTWFuYWdlci5wcm90b3R5cGUuZ2V0T3JDcmVhdGVGaWx0ZXJXcmFwcGVyID0gZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgdmFyIGZpbHRlcldyYXBwZXIgPSB0aGlzLmFsbEZpbHRlcnNbY29sdW1uLmNvbElkXTtcblxuICAgIGlmICghZmlsdGVyV3JhcHBlcikge1xuICAgICAgICBmaWx0ZXJXcmFwcGVyID0gdGhpcy5jcmVhdGVGaWx0ZXJXcmFwcGVyKGNvbHVtbik7XG4gICAgICAgIHRoaXMuYWxsRmlsdGVyc1tjb2x1bW4uY29sSWRdID0gZmlsdGVyV3JhcHBlcjtcbiAgICB9XG5cbiAgICByZXR1cm4gZmlsdGVyV3JhcHBlcjtcbn07XG5cbkZpbHRlck1hbmFnZXIucHJvdG90eXBlLmNyZWF0ZUZpbHRlcldyYXBwZXIgPSBmdW5jdGlvbihjb2x1bW4pIHtcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcblxuICAgIHZhciBmaWx0ZXJXcmFwcGVyID0ge1xuICAgICAgICBjb2x1bW46IGNvbHVtblxuICAgIH07XG4gICAgdmFyIGZpbHRlckNoYW5nZWRDYWxsYmFjayA9IHRoaXMuZ3JpZC5vbkZpbHRlckNoYW5nZWQuYmluZCh0aGlzLmdyaWQpO1xuICAgIHZhciBmaWx0ZXJQYXJhbXMgPSBjb2xEZWYuZmlsdGVyUGFyYW1zO1xuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgIGNvbERlZjogY29sRGVmLFxuICAgICAgICByb3dNb2RlbDogdGhpcy5yb3dNb2RlbCxcbiAgICAgICAgZmlsdGVyQ2hhbmdlZENhbGxiYWNrOiBmaWx0ZXJDaGFuZ2VkQ2FsbGJhY2ssXG4gICAgICAgIGZpbHRlclBhcmFtczogZmlsdGVyUGFyYW1zLFxuICAgICAgICBsb2NhbGVUZXh0RnVuYzogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0TG9jYWxlVGV4dEZ1bmMoKSxcbiAgICAgICAgdmFsdWVHZXR0ZXI6IHRoaXMuY3JlYXRlVmFsdWVHZXR0ZXIoY29sRGVmKVxuICAgIH07XG4gICAgaWYgKHR5cGVvZiBjb2xEZWYuZmlsdGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIGlmIHVzZXIgcHJvdmlkZWQgYSBmaWx0ZXIsIGp1c3QgdXNlIGl0XG4gICAgICAgIC8vIGZpcnN0IHVwLCBjcmVhdGUgY2hpbGQgc2NvcGUgaWYgbmVlZGVkXG4gICAgICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0FuZ3VsYXJDb21waWxlRmlsdGVycygpKSB7XG4gICAgICAgICAgICB2YXIgc2NvcGUgPSB0aGlzLiRzY29wZS4kbmV3KCk7XG4gICAgICAgICAgICBmaWx0ZXJXcmFwcGVyLnNjb3BlID0gc2NvcGU7XG4gICAgICAgICAgICBwYXJhbXMuJHNjb3BlID0gc2NvcGU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbm93IGNyZWF0ZSBmaWx0ZXJcbiAgICAgICAgZmlsdGVyV3JhcHBlci5maWx0ZXIgPSBuZXcgY29sRGVmLmZpbHRlcihwYXJhbXMpO1xuICAgIH0gZWxzZSBpZiAoY29sRGVmLmZpbHRlciA9PT0gJ3RleHQnKSB7XG4gICAgICAgIGZpbHRlcldyYXBwZXIuZmlsdGVyID0gbmV3IFN0cmluZ0ZpbHRlcihwYXJhbXMpO1xuICAgIH0gZWxzZSBpZiAoY29sRGVmLmZpbHRlciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgZmlsdGVyV3JhcHBlci5maWx0ZXIgPSBuZXcgTnVtYmVyRmlsdGVyKHBhcmFtcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmlsdGVyV3JhcHBlci5maWx0ZXIgPSBuZXcgU2V0RmlsdGVyKHBhcmFtcyk7XG4gICAgfVxuXG4gICAgaWYgKCFmaWx0ZXJXcmFwcGVyLmZpbHRlci5nZXRHdWkpIHsgLy8gYmVjYXVzZSB1c2VycyBjYW4gZG8gY3VzdG9tIGZpbHRlcnMsIGdpdmUgbmljZSBlcnJvciBtZXNzYWdlXG4gICAgICAgIHRocm93ICdGaWx0ZXIgaXMgbWlzc2luZyBtZXRob2QgZ2V0R3VpJztcbiAgICB9XG5cbiAgICB2YXIgZUZpbHRlckd1aSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVGaWx0ZXJHdWkuY2xhc3NOYW1lID0gJ2FnLWZpbHRlcic7XG4gICAgdmFyIGd1aUZyb21GaWx0ZXIgPSBmaWx0ZXJXcmFwcGVyLmZpbHRlci5nZXRHdWkoKTtcbiAgICBpZiAodXRpbHMuaXNOb2RlT3JFbGVtZW50KGd1aUZyb21GaWx0ZXIpKSB7XG4gICAgICAgIC8vYSBkb20gbm9kZSBvciBlbGVtZW50IHdhcyByZXR1cm5lZCwgc28gYWRkIGNoaWxkXG4gICAgICAgIGVGaWx0ZXJHdWkuYXBwZW5kQ2hpbGQoZ3VpRnJvbUZpbHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy9vdGhlcndpc2UgYXNzdW1lIGl0IHdhcyBodG1sLCBzbyBqdXN0IGluc2VydFxuICAgICAgICB2YXIgZVRleHRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBlVGV4dFNwYW4uaW5uZXJIVE1MID0gZ3VpRnJvbUZpbHRlcjtcbiAgICAgICAgZUZpbHRlckd1aS5hcHBlbmRDaGlsZChlVGV4dFNwYW4pO1xuICAgIH1cblxuICAgIGlmIChmaWx0ZXJXcmFwcGVyLnNjb3BlKSB7XG4gICAgICAgIGZpbHRlcldyYXBwZXIuZ3VpID0gdGhpcy4kY29tcGlsZShlRmlsdGVyR3VpKShmaWx0ZXJXcmFwcGVyLnNjb3BlKVswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmaWx0ZXJXcmFwcGVyLmd1aSA9IGVGaWx0ZXJHdWk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpbHRlcldyYXBwZXI7XG59O1xuXG5GaWx0ZXJNYW5hZ2VyLnByb3RvdHlwZS5zaG93RmlsdGVyID0gZnVuY3Rpb24oY29sdW1uLCBldmVudFNvdXJjZSkge1xuXG4gICAgdmFyIGZpbHRlcldyYXBwZXIgPSB0aGlzLmdldE9yQ3JlYXRlRmlsdGVyV3JhcHBlcihjb2x1bW4pO1xuXG4gICAgdmFyIGVQb3B1cFBhcmVudCA9IHRoaXMuZ3JpZC5nZXRQb3B1cFBhcmVudCgpO1xuICAgIHRoaXMucG9zaXRpb25Qb3B1cChldmVudFNvdXJjZSwgZmlsdGVyV3JhcHBlci5ndWksIGVQb3B1cFBhcmVudCk7XG5cbiAgICB1dGlscy5hZGRBc01vZGFsUG9wdXAoZVBvcHVwUGFyZW50LCBmaWx0ZXJXcmFwcGVyLmd1aSk7XG5cbiAgICBpZiAoZmlsdGVyV3JhcHBlci5maWx0ZXIuYWZ0ZXJHdWlBdHRhY2hlZCkge1xuICAgICAgICBmaWx0ZXJXcmFwcGVyLmZpbHRlci5hZnRlckd1aUF0dGFjaGVkKCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXJNYW5hZ2VyO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXY+PGRpdj48c2VsZWN0IGNsYXNzPWFnLWZpbHRlci1zZWxlY3QgaWQ9ZmlsdGVyVHlwZT48b3B0aW9uIHZhbHVlPTE+W0VRVUFMU108L29wdGlvbj48b3B0aW9uIHZhbHVlPTI+W0xFU1MgVEhBTl08L29wdGlvbj48b3B0aW9uIHZhbHVlPTM+W0dSRUFURVIgVEhBTl08L29wdGlvbj48L3NlbGVjdD48L2Rpdj48ZGl2PjxpbnB1dCBjbGFzcz1hZy1maWx0ZXItZmlsdGVyIGlkPWZpbHRlclRleHQgdHlwZT10ZXh0IHBsYWNlaG9sZGVyPVxcXCJbRklMVEVSLi4uXVxcXCI+PC9kaXY+PC9kaXY+XCI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL251bWJlckZpbHRlci5odG1sJyk7XG5cbnZhciBFUVVBTFMgPSAxO1xudmFyIExFU1NfVEhBTiA9IDI7XG52YXIgR1JFQVRFUl9USEFOID0gMztcblxuZnVuY3Rpb24gTnVtYmVyRmlsdGVyKHBhcmFtcykge1xuICAgIHRoaXMuZmlsdGVyUGFyYW1zID0gcGFyYW1zLmZpbHRlclBhcmFtcztcbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjayA9IHBhcmFtcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2s7XG4gICAgdGhpcy5sb2NhbGVUZXh0RnVuYyA9IHBhcmFtcy5sb2NhbGVUZXh0RnVuYztcbiAgICB0aGlzLnZhbHVlR2V0dGVyID0gcGFyYW1zLnZhbHVlR2V0dGVyO1xuICAgIHRoaXMuY3JlYXRlR3VpKCk7XG4gICAgdGhpcy5maWx0ZXJOdW1iZXIgPSBudWxsO1xuICAgIHRoaXMuZmlsdGVyVHlwZSA9IEVRVUFMUztcbiAgICB0aGlzLmNyZWF0ZUFwaSgpO1xufVxuXG4vKiBwdWJsaWMgKi9cbk51bWJlckZpbHRlci5wcm90b3R5cGUub25OZXdSb3dzTG9hZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGtlZXBTZWxlY3Rpb24gPSB0aGlzLmZpbHRlclBhcmFtcyAmJiB0aGlzLmZpbHRlclBhcmFtcy5uZXdSb3dzQWN0aW9uID09PSAna2VlcCc7XG4gICAgaWYgKCFrZWVwU2VsZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuYXBpLnNldFR5cGUoRVFVQUxTKTtcbiAgICAgICAgdGhpcy5hcGkuc2V0RmlsdGVyKG51bGwpO1xuICAgIH1cbn07XG5cbi8qIHB1YmxpYyAqL1xuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5hZnRlckd1aUF0dGFjaGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lRmlsdGVyVGV4dEZpZWxkLmZvY3VzKCk7XG59O1xuXG4vKiBwdWJsaWMgKi9cbk51bWJlckZpbHRlci5wcm90b3R5cGUuZG9lc0ZpbHRlclBhc3MgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKHRoaXMuZmlsdGVyTnVtYmVyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlR2V0dGVyKG5vZGUpO1xuXG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlQXNOdW1iZXI7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdmFsdWVBc051bWJlciA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlQXNOdW1iZXIgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHRoaXMuZmlsdGVyVHlwZSkge1xuICAgICAgICBjYXNlIEVRVUFMUzpcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUFzTnVtYmVyID09PSB0aGlzLmZpbHRlck51bWJlcjtcbiAgICAgICAgY2FzZSBMRVNTX1RIQU46XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVBc051bWJlciA8PSB0aGlzLmZpbHRlck51bWJlcjtcbiAgICAgICAgY2FzZSBHUkVBVEVSX1RIQU46XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVBc051bWJlciA+PSB0aGlzLmZpbHRlck51bWJlcjtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIHNob3VsZCBuZXZlciBoYXBwZW5cbiAgICAgICAgICAgIGNvbnNvbGUud2FybignaW52YWxpZCBmaWx0ZXIgdHlwZSAnICsgdGhpcy5maWx0ZXJUeXBlKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKiBwdWJsaWMgKi9cbk51bWJlckZpbHRlci5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZUd1aTtcbn07XG5cbi8qIHB1YmxpYyAqL1xuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5pc0ZpbHRlckFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlck51bWJlciAhPT0gbnVsbDtcbn07XG5cbk51bWJlckZpbHRlci5wcm90b3R5cGUuY3JlYXRlVGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGVtcGxhdGVcbiAgICAgICAgLnJlcGxhY2UoJ1tGSUxURVIuLi5dJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnZmlsdGVyT29vJywgJ0ZpbHRlci4uLicpKVxuICAgICAgICAucmVwbGFjZSgnW0VRVUFMU10nLCB0aGlzLmxvY2FsZVRleHRGdW5jKCdlcXVhbHMnLCAnRXF1YWxzJykpXG4gICAgICAgIC5yZXBsYWNlKCdbTEVTUyBUSEFOXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2xlc3NUaGFuJywgJ0xlc3MgdGhhbicpKVxuICAgICAgICAucmVwbGFjZSgnW0dSRUFURVIgVEhBTl0nLCB0aGlzLmxvY2FsZVRleHRGdW5jKCdncmVhdGVyVGhhbicsICdHcmVhdGVyIHRoYW4nKSk7XG59O1xuXG5OdW1iZXJGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZUd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0aGlzLmNyZWF0ZVRlbXBsYXRlKCkpO1xuICAgIHRoaXMuZUZpbHRlclRleHRGaWVsZCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiI2ZpbHRlclRleHRcIik7XG4gICAgdGhpcy5lVHlwZVNlbGVjdCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiI2ZpbHRlclR5cGVcIik7XG5cbiAgICB1dGlscy5hZGRDaGFuZ2VMaXN0ZW5lcih0aGlzLmVGaWx0ZXJUZXh0RmllbGQsIHRoaXMub25GaWx0ZXJDaGFuZ2VkLmJpbmQodGhpcykpO1xuICAgIHRoaXMuZVR5cGVTZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uVHlwZUNoYW5nZWQuYmluZCh0aGlzKSk7XG59O1xuXG5OdW1iZXJGaWx0ZXIucHJvdG90eXBlLm9uVHlwZUNoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmZpbHRlclR5cGUgPSBwYXJzZUludCh0aGlzLmVUeXBlU2VsZWN0LnZhbHVlKTtcbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjaygpO1xufTtcblxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5vbkZpbHRlckNoYW5nZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZmlsdGVyVGV4dCA9IHV0aWxzLm1ha2VOdWxsKHRoaXMuZUZpbHRlclRleHRGaWVsZC52YWx1ZSk7XG4gICAgaWYgKGZpbHRlclRleHQgJiYgZmlsdGVyVGV4dC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgIGZpbHRlclRleHQgPSBudWxsO1xuICAgIH1cbiAgICBpZiAoZmlsdGVyVGV4dCkge1xuICAgICAgICB0aGlzLmZpbHRlck51bWJlciA9IHBhcnNlRmxvYXQoZmlsdGVyVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5maWx0ZXJOdW1iZXIgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjaygpO1xufTtcblxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5jcmVhdGVBcGkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5hcGkgPSB7XG4gICAgICAgIEVRVUFMUzogRVFVQUxTLFxuICAgICAgICBMRVNTX1RIQU46IExFU1NfVEhBTixcbiAgICAgICAgR1JFQVRFUl9USEFOOiBHUkVBVEVSX1RIQU4sXG4gICAgICAgIHNldFR5cGU6IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIHRoYXQuZmlsdGVyVHlwZSA9IHR5cGU7XG4gICAgICAgICAgICB0aGF0LmVUeXBlU2VsZWN0LnZhbHVlID0gdHlwZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0RmlsdGVyOiBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICAgICAgICAgIGZpbHRlciA9IHV0aWxzLm1ha2VOdWxsKGZpbHRlcik7XG5cbiAgICAgICAgICAgIGlmIChmaWx0ZXIhPT1udWxsICYmICEodHlwZW9mIGZpbHRlciA9PT0gJ251bWJlcicpKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyID0gcGFyc2VGbG9hdChmaWx0ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhhdC5maWx0ZXJOdW1iZXIgPSBmaWx0ZXI7XG4gICAgICAgICAgICB0aGF0LmVGaWx0ZXJUZXh0RmllbGQudmFsdWUgPSBmaWx0ZXI7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZmlsdGVyVHlwZTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RmlsdGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmZpbHRlck51bWJlcjtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0TW9kZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoYXQuaXNGaWx0ZXJBY3RpdmUoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRoYXQuZmlsdGVyVHlwZSxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB0aGF0LmZpbHRlck51bWJlclxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzZXRNb2RlbDogZnVuY3Rpb24oZGF0YU1vZGVsKSB7XG4gICAgICAgICAgICBpZiAoZGF0YU1vZGVsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGRhdGFNb2RlbC50eXBlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZpbHRlcihkYXRhTW9kZWwuZmlsdGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRGaWx0ZXIobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuTnVtYmVyRmlsdGVyLnByb3RvdHlwZS5nZXRBcGkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hcGk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE51bWJlckZpbHRlcjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2PjxkaXYgY2xhc3M9YWctZmlsdGVyLWhlYWRlci1jb250YWluZXI+PGlucHV0IGNsYXNzPWFnLWZpbHRlci1maWx0ZXIgdHlwZT10ZXh0IHBsYWNlaG9sZGVyPVxcXCJbU0VBUkNILi4uXVxcXCI+PC9kaXY+PGRpdiBjbGFzcz1hZy1maWx0ZXItaGVhZGVyLWNvbnRhaW5lcj48bGFiZWw+PGlucHV0IGlkPXNlbGVjdEFsbCB0eXBlPWNoZWNrYm94IGNsYXNzPVxcXCJhZy1maWx0ZXItY2hlY2tib3hcXFwiPiAoW1NFTEVDVCBBTExdKTwvbGFiZWw+PC9kaXY+PGRpdiBjbGFzcz1hZy1maWx0ZXItbGlzdC12aWV3cG9ydD48ZGl2IGNsYXNzPWFnLWZpbHRlci1saXN0LWNvbnRhaW5lcj48ZGl2IGlkPWl0ZW1Gb3JSZXBlYXQgY2xhc3M9YWctZmlsdGVyLWl0ZW0+PGxhYmVsPjxpbnB1dCB0eXBlPWNoZWNrYm94IGNsYXNzPWFnLWZpbHRlci1jaGVja2JveCBmaWx0ZXItY2hlY2tib3g9XFxcInRydWVcXFwiPiA8c3BhbiBjbGFzcz1hZy1maWx0ZXItdmFsdWU+PC9zcGFuPjwvbGFiZWw+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+XCI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgU2V0RmlsdGVyTW9kZWwgPSByZXF1aXJlKCcuL3NldEZpbHRlck1vZGVsJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3NldEZpbHRlci5odG1sJyk7XG5cbnZhciBERUZBVUxUX1JPV19IRUlHSFQgPSAyMDtcblxuZnVuY3Rpb24gU2V0RmlsdGVyKHBhcmFtcykge1xuICAgIHRoaXMuZmlsdGVyUGFyYW1zID0gcGFyYW1zLmZpbHRlclBhcmFtcztcbiAgICB0aGlzLnJvd0hlaWdodCA9ICh0aGlzLmZpbHRlclBhcmFtcyAmJiB0aGlzLmZpbHRlclBhcmFtcy5jZWxsSGVpZ2h0KSA/IHRoaXMuZmlsdGVyUGFyYW1zLmNlbGxIZWlnaHQgOiBERUZBVUxUX1JPV19IRUlHSFQ7XG4gICAgdGhpcy5tb2RlbCA9IG5ldyBTZXRGaWx0ZXJNb2RlbChwYXJhbXMuY29sRGVmLCBwYXJhbXMucm93TW9kZWwsIHBhcmFtcy52YWx1ZUdldHRlcik7XG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2sgPSBwYXJhbXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrO1xuICAgIHRoaXMudmFsdWVHZXR0ZXIgPSBwYXJhbXMudmFsdWVHZXR0ZXI7XG4gICAgdGhpcy5yb3dzSW5Cb2R5Q29udGFpbmVyID0ge307XG4gICAgdGhpcy5jb2xEZWYgPSBwYXJhbXMuY29sRGVmO1xuICAgIHRoaXMubG9jYWxlVGV4dEZ1bmMgPSBwYXJhbXMubG9jYWxlVGV4dEZ1bmM7XG4gICAgaWYgKHRoaXMuZmlsdGVyUGFyYW1zKSB7XG4gICAgICAgIHRoaXMuY2VsbFJlbmRlcmVyID0gdGhpcy5maWx0ZXJQYXJhbXMuY2VsbFJlbmRlcmVyO1xuICAgIH1cbiAgICB0aGlzLmNyZWF0ZUd1aSgpO1xuICAgIHRoaXMuYWRkU2Nyb2xsTGlzdGVuZXIoKTtcbiAgICB0aGlzLmNyZWF0ZUFwaSgpO1xufVxuXG4vLyB3ZSBuZWVkIHRvIGhhdmUgdGhlIGd1aSBhdHRhY2hlZCBiZWZvcmUgd2UgY2FuIGRyYXcgdGhlIHZpcnR1YWwgcm93cywgYXMgdGhlXG4vLyB2aXJ0dWFsIHJvdyBsb2dpYyBuZWVkcyBpbmZvIGFib3V0IHRoZSBndWkgc3RhdGVcbi8qIHB1YmxpYyAqL1xuU2V0RmlsdGVyLnByb3RvdHlwZS5hZnRlckd1aUF0dGFjaGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kcmF3VmlydHVhbFJvd3MoKTtcbn07XG5cbi8qIHB1YmxpYyAqL1xuU2V0RmlsdGVyLnByb3RvdHlwZS5pc0ZpbHRlckFjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1vZGVsLmlzRmlsdGVyQWN0aXZlKCk7XG59O1xuXG4vKiBwdWJsaWMgKi9cblNldEZpbHRlci5wcm90b3R5cGUuZG9lc0ZpbHRlclBhc3MgPSBmdW5jdGlvbihub2RlKSB7XG5cbiAgICAvL2lmIG5vIGZpbHRlciwgYWx3YXlzIHBhc3NcbiAgICBpZiAodGhpcy5tb2RlbC5pc0V2ZXJ5dGhpbmdTZWxlY3RlZCgpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvL2lmIG5vdGhpbmcgc2VsZWN0ZWQgaW4gZmlsdGVyLCBhbHdheXMgZmFpbFxuICAgIGlmICh0aGlzLm1vZGVsLmlzTm90aGluZ1NlbGVjdGVkKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWVHZXR0ZXIobm9kZSk7XG4gICAgdmFsdWUgPSB1dGlscy5tYWtlTnVsbCh2YWx1ZSk7XG5cbiAgICB2YXIgZmlsdGVyUGFzc2VkID0gdGhpcy5tb2RlbC5pc1ZhbHVlU2VsZWN0ZWQodmFsdWUpO1xuICAgIHJldHVybiBmaWx0ZXJQYXNzZWQ7XG59O1xuXG4vKiBwdWJsaWMgKi9cblNldEZpbHRlci5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZUd1aTtcbn07XG5cbi8qIHB1YmxpYyAqL1xuU2V0RmlsdGVyLnByb3RvdHlwZS5vbk5ld1Jvd3NMb2FkZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIga2VlcFNlbGVjdGlvbiA9IHRoaXMuZmlsdGVyUGFyYW1zICYmIHRoaXMuZmlsdGVyUGFyYW1zLm5ld1Jvd3NBY3Rpb24gPT09ICdrZWVwJztcbiAgICAvLyBkZWZhdWx0IGlzIHJlc2V0XG4gICAgdGhpcy5tb2RlbC5yZWZyZXNoVW5pcXVlVmFsdWVzKGtlZXBTZWxlY3Rpb24pO1xuICAgIHRoaXMuc2V0Q29udGFpbmVySGVpZ2h0KCk7XG4gICAgdGhpcy5yZWZyZXNoVmlydHVhbFJvd3MoKTtcbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUuY3JlYXRlVGVtcGxhdGUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGVtcGxhdGVcbiAgICAgICAgLnJlcGxhY2UoJ1tTRUxFQ1QgQUxMXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ3NlbGVjdEFsbCcsICdTZWxlY3QgQWxsJykpXG4gICAgICAgIC5yZXBsYWNlKCdbU0VBUkNILi4uXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ3NlYXJjaE9vbycsICdTZWFyY2guLi4nKSk7XG59O1xuXG5TZXRGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZUd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLmVHdWkgPSB1dGlscy5sb2FkVGVtcGxhdGUodGhpcy5jcmVhdGVUZW1wbGF0ZSgpKTtcblxuICAgIHRoaXMuZUxpc3RDb250YWluZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcihcIi5hZy1maWx0ZXItbGlzdC1jb250YWluZXJcIik7XG4gICAgdGhpcy5lRmlsdGVyVmFsdWVUZW1wbGF0ZSA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiI2l0ZW1Gb3JSZXBlYXRcIik7XG4gICAgdGhpcy5lU2VsZWN0QWxsID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoXCIjc2VsZWN0QWxsXCIpO1xuICAgIHRoaXMuZUxpc3RWaWV3cG9ydCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiLmFnLWZpbHRlci1saXN0LXZpZXdwb3J0XCIpO1xuICAgIHRoaXMuZU1pbmlGaWx0ZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcihcIi5hZy1maWx0ZXItZmlsdGVyXCIpO1xuICAgIHRoaXMuZUxpc3RDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gKHRoaXMubW9kZWwuZ2V0VW5pcXVlVmFsdWVDb3VudCgpICogdGhpcy5yb3dIZWlnaHQpICsgXCJweFwiO1xuXG4gICAgdGhpcy5zZXRDb250YWluZXJIZWlnaHQoKTtcbiAgICB0aGlzLmVNaW5pRmlsdGVyLnZhbHVlID0gdGhpcy5tb2RlbC5nZXRNaW5pRmlsdGVyKCk7XG4gICAgdXRpbHMuYWRkQ2hhbmdlTGlzdGVuZXIodGhpcy5lTWluaUZpbHRlciwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLm9uTWluaUZpbHRlckNoYW5nZWQoKTtcbiAgICB9KTtcbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmVMaXN0Q29udGFpbmVyKTtcblxuICAgIHRoaXMuZVNlbGVjdEFsbC5vbmNsaWNrID0gdGhpcy5vblNlbGVjdEFsbC5iaW5kKHRoaXMpO1xuXG4gICAgaWYgKHRoaXMubW9kZWwuaXNFdmVyeXRoaW5nU2VsZWN0ZWQoKSkge1xuICAgICAgICB0aGlzLmVTZWxlY3RBbGwuaW5kZXRlcm1pbmF0ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmVTZWxlY3RBbGwuY2hlY2tlZCA9IHRydWU7XG4gICAgfSBlbHNlIGlmICh0aGlzLm1vZGVsLmlzTm90aGluZ1NlbGVjdGVkKCkpIHtcbiAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmNoZWNrZWQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVTZWxlY3RBbGwuaW5kZXRlcm1pbmF0ZSA9IHRydWU7XG4gICAgfVxufTtcblxuU2V0RmlsdGVyLnByb3RvdHlwZS5zZXRDb250YWluZXJIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVMaXN0Q29udGFpbmVyLnN0eWxlLmhlaWdodCA9ICh0aGlzLm1vZGVsLmdldERpc3BsYXllZFZhbHVlQ291bnQoKSAqIHRoaXMucm93SGVpZ2h0KSArIFwicHhcIjtcbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUuZHJhd1ZpcnR1YWxSb3dzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRvcFBpeGVsID0gdGhpcy5lTGlzdFZpZXdwb3J0LnNjcm9sbFRvcDtcbiAgICB2YXIgYm90dG9tUGl4ZWwgPSB0b3BQaXhlbCArIHRoaXMuZUxpc3RWaWV3cG9ydC5vZmZzZXRIZWlnaHQ7XG5cbiAgICB2YXIgZmlyc3RSb3cgPSBNYXRoLmZsb29yKHRvcFBpeGVsIC8gdGhpcy5yb3dIZWlnaHQpO1xuICAgIHZhciBsYXN0Um93ID0gTWF0aC5mbG9vcihib3R0b21QaXhlbCAvIHRoaXMucm93SGVpZ2h0KTtcblxuICAgIHRoaXMuZW5zdXJlUm93c1JlbmRlcmVkKGZpcnN0Um93LCBsYXN0Um93KTtcbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUuZW5zdXJlUm93c1JlbmRlcmVkID0gZnVuY3Rpb24oc3RhcnQsIGZpbmlzaCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvL2F0IHRoZSBlbmQsIHRoaXMgYXJyYXkgd2lsbCBjb250YWluIHRoZSBpdGVtcyB3ZSBuZWVkIHRvIHJlbW92ZVxuICAgIHZhciByb3dzVG9SZW1vdmUgPSBPYmplY3Qua2V5cyh0aGlzLnJvd3NJbkJvZHlDb250YWluZXIpO1xuXG4gICAgLy9hZGQgaW4gbmV3IHJvd3NcbiAgICBmb3IgKHZhciByb3dJbmRleCA9IHN0YXJ0OyByb3dJbmRleCA8PSBmaW5pc2g7IHJvd0luZGV4KyspIHtcbiAgICAgICAgLy9zZWUgaWYgaXRlbSBhbHJlYWR5IHRoZXJlLCBhbmQgaWYgeWVzLCB0YWtlIGl0IG91dCBvZiB0aGUgJ3RvIHJlbW92ZScgYXJyYXlcbiAgICAgICAgaWYgKHJvd3NUb1JlbW92ZS5pbmRleE9mKHJvd0luZGV4LnRvU3RyaW5nKCkpID49IDApIHtcbiAgICAgICAgICAgIHJvd3NUb1JlbW92ZS5zcGxpY2Uocm93c1RvUmVtb3ZlLmluZGV4T2Yocm93SW5kZXgudG9TdHJpbmcoKSksIDEpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy9jaGVjayB0aGlzIHJvdyBhY3R1YWxseSBleGlzdHMgKGluIGNhc2Ugb3ZlcmZsb3cgYnVmZmVyIHdpbmRvdyBleGNlZWRzIHJlYWwgZGF0YSlcbiAgICAgICAgaWYgKHRoaXMubW9kZWwuZ2V0RGlzcGxheWVkVmFsdWVDb3VudCgpID4gcm93SW5kZXgpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoaXMubW9kZWwuZ2V0RGlzcGxheWVkVmFsdWUocm93SW5kZXgpO1xuICAgICAgICAgICAgX3RoaXMuaW5zZXJ0Um93KHZhbHVlLCByb3dJbmRleCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL2F0IHRoaXMgcG9pbnQsIGV2ZXJ5dGhpbmcgaW4gb3VyICdyb3dzVG9SZW1vdmUnIC4gLiAuXG4gICAgdGhpcy5yZW1vdmVWaXJ0dWFsUm93cyhyb3dzVG9SZW1vdmUpO1xufTtcblxuLy90YWtlcyBhcnJheSBvZiByb3cgaWQnc1xuU2V0RmlsdGVyLnByb3RvdHlwZS5yZW1vdmVWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKHJvd3NUb1JlbW92ZSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgcm93c1RvUmVtb3ZlLmZvckVhY2goZnVuY3Rpb24oaW5kZXhUb1JlbW92ZSkge1xuICAgICAgICB2YXIgZVJvd1RvUmVtb3ZlID0gX3RoaXMucm93c0luQm9keUNvbnRhaW5lcltpbmRleFRvUmVtb3ZlXTtcbiAgICAgICAgX3RoaXMuZUxpc3RDb250YWluZXIucmVtb3ZlQ2hpbGQoZVJvd1RvUmVtb3ZlKTtcbiAgICAgICAgZGVsZXRlIF90aGlzLnJvd3NJbkJvZHlDb250YWluZXJbaW5kZXhUb1JlbW92ZV07XG4gICAgfSk7XG59O1xuXG5TZXRGaWx0ZXIucHJvdG90eXBlLmluc2VydFJvdyA9IGZ1bmN0aW9uKHZhbHVlLCByb3dJbmRleCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB2YXIgZUZpbHRlclZhbHVlID0gdGhpcy5lRmlsdGVyVmFsdWVUZW1wbGF0ZS5jbG9uZU5vZGUodHJ1ZSk7XG5cbiAgICB2YXIgdmFsdWVFbGVtZW50ID0gZUZpbHRlclZhbHVlLnF1ZXJ5U2VsZWN0b3IoXCIuYWctZmlsdGVyLXZhbHVlXCIpO1xuICAgIGlmICh0aGlzLmNlbGxSZW5kZXJlcikge1xuICAgICAgICAvL3JlbmRlcmVyIHByb3ZpZGVkLCBzbyB1c2UgaXRcbiAgICAgICAgdmFyIHJlc3VsdEZyb21SZW5kZXJlciA9IHRoaXMuY2VsbFJlbmRlcmVyKHtcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodXRpbHMuaXNOb2RlKHJlc3VsdEZyb21SZW5kZXJlcikpIHtcbiAgICAgICAgICAgIC8vYSBkb20gbm9kZSBvciBlbGVtZW50IHdhcyByZXR1cm5lZCwgc28gYWRkIGNoaWxkXG4gICAgICAgICAgICB2YWx1ZUVsZW1lbnQuYXBwZW5kQ2hpbGQocmVzdWx0RnJvbVJlbmRlcmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vb3RoZXJ3aXNlIGFzc3VtZSBpdCB3YXMgaHRtbCwgc28ganVzdCBpbnNlcnRcbiAgICAgICAgICAgIHZhbHVlRWxlbWVudC5pbm5lckhUTUwgPSByZXN1bHRGcm9tUmVuZGVyZXI7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vb3RoZXJ3aXNlIGRpc3BsYXkgYXMgYSBzdHJpbmdcbiAgICAgICAgdmFyIGJsYW5rc1RleHQgPSAnKCcgKyB0aGlzLmxvY2FsZVRleHRGdW5jKCdibGFua3MnLCAnQmxhbmtzJykgKyAnKSc7XG4gICAgICAgIHZhciBkaXNwbGF5TmFtZU9mVmFsdWUgPSB2YWx1ZSA9PT0gbnVsbCA/IGJsYW5rc1RleHQgOiB2YWx1ZTtcbiAgICAgICAgdmFsdWVFbGVtZW50LmlubmVySFRNTCA9IGRpc3BsYXlOYW1lT2ZWYWx1ZTtcbiAgICB9XG4gICAgdmFyIGVDaGVja2JveCA9IGVGaWx0ZXJWYWx1ZS5xdWVyeVNlbGVjdG9yKFwiaW5wdXRcIik7XG4gICAgZUNoZWNrYm94LmNoZWNrZWQgPSB0aGlzLm1vZGVsLmlzVmFsdWVTZWxlY3RlZCh2YWx1ZSk7XG5cbiAgICBlQ2hlY2tib3gub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5vbkNoZWNrYm94Q2xpY2tlZChlQ2hlY2tib3gsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgZUZpbHRlclZhbHVlLnN0eWxlLnRvcCA9ICh0aGlzLnJvd0hlaWdodCAqIHJvd0luZGV4KSArIFwicHhcIjtcblxuICAgIHRoaXMuZUxpc3RDb250YWluZXIuYXBwZW5kQ2hpbGQoZUZpbHRlclZhbHVlKTtcbiAgICB0aGlzLnJvd3NJbkJvZHlDb250YWluZXJbcm93SW5kZXhdID0gZUZpbHRlclZhbHVlO1xufTtcblxuU2V0RmlsdGVyLnByb3RvdHlwZS5vbkNoZWNrYm94Q2xpY2tlZCA9IGZ1bmN0aW9uKGVDaGVja2JveCwgdmFsdWUpIHtcbiAgICB2YXIgY2hlY2tlZCA9IGVDaGVja2JveC5jaGVja2VkO1xuICAgIGlmIChjaGVja2VkKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2VsZWN0VmFsdWUodmFsdWUpO1xuICAgICAgICBpZiAodGhpcy5tb2RlbC5pc0V2ZXJ5dGhpbmdTZWxlY3RlZCgpKSB7XG4gICAgICAgICAgICB0aGlzLmVTZWxlY3RBbGwuaW5kZXRlcm1pbmF0ZSA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5tb2RlbC51bnNlbGVjdFZhbHVlKHZhbHVlKTtcbiAgICAgICAgLy9pZiBzZXQgaXMgZW1wdHksIG5vdGhpbmcgaXMgc2VsZWN0ZWRcbiAgICAgICAgaWYgKHRoaXMubW9kZWwuaXNOb3RoaW5nU2VsZWN0ZWQoKSkge1xuICAgICAgICAgICAgdGhpcy5lU2VsZWN0QWxsLmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuZVNlbGVjdEFsbC5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVTZWxlY3RBbGwuaW5kZXRlcm1pbmF0ZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjaygpO1xufTtcblxuU2V0RmlsdGVyLnByb3RvdHlwZS5vbk1pbmlGaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1pbmlGaWx0ZXJDaGFuZ2VkID0gdGhpcy5tb2RlbC5zZXRNaW5pRmlsdGVyKHRoaXMuZU1pbmlGaWx0ZXIudmFsdWUpO1xuICAgIGlmIChtaW5pRmlsdGVyQ2hhbmdlZCkge1xuICAgICAgICB0aGlzLnNldENvbnRhaW5lckhlaWdodCgpO1xuICAgICAgICB0aGlzLnJlZnJlc2hWaXJ0dWFsUm93cygpO1xuICAgIH1cbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUucmVmcmVzaFZpcnR1YWxSb3dzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jbGVhclZpcnR1YWxSb3dzKCk7XG4gICAgdGhpcy5kcmF3VmlydHVhbFJvd3MoKTtcbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUuY2xlYXJWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByb3dzVG9SZW1vdmUgPSBPYmplY3Qua2V5cyh0aGlzLnJvd3NJbkJvZHlDb250YWluZXIpO1xuICAgIHRoaXMucmVtb3ZlVmlydHVhbFJvd3Mocm93c1RvUmVtb3ZlKTtcbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUub25TZWxlY3RBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2hlY2tlZCA9IHRoaXMuZVNlbGVjdEFsbC5jaGVja2VkO1xuICAgIGlmIChjaGVja2VkKSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2VsZWN0RXZlcnl0aGluZygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubW9kZWwuc2VsZWN0Tm90aGluZygpO1xuICAgIH1cbiAgICB0aGlzLnVwZGF0ZUFsbENoZWNrYm94ZXMoY2hlY2tlZCk7XG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2soKTtcbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUudXBkYXRlQWxsQ2hlY2tib3hlcyA9IGZ1bmN0aW9uKGNoZWNrZWQpIHtcbiAgICB2YXIgY3VycmVudGx5RGlzcGxheWVkQ2hlY2tib3hlcyA9IHRoaXMuZUxpc3RDb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcIltmaWx0ZXItY2hlY2tib3g9dHJ1ZV1cIik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjdXJyZW50bHlEaXNwbGF5ZWRDaGVja2JveGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBjdXJyZW50bHlEaXNwbGF5ZWRDaGVja2JveGVzW2ldLmNoZWNrZWQgPSBjaGVja2VkO1xuICAgIH1cbn07XG5cblNldEZpbHRlci5wcm90b3R5cGUuYWRkU2Nyb2xsTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy5lTGlzdFZpZXdwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmRyYXdWaXJ0dWFsUm93cygpO1xuICAgIH0pO1xufTtcblxuU2V0RmlsdGVyLnByb3RvdHlwZS5nZXRBcGkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hcGk7XG59O1xuXG5TZXRGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZUFwaSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBtb2RlbCA9IHRoaXMubW9kZWw7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuYXBpID0ge1xuICAgICAgICBzZXRNaW5pRmlsdGVyOiBmdW5jdGlvbihuZXdNaW5pRmlsdGVyKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXRNaW5pRmlsdGVyKG5ld01pbmlGaWx0ZXIpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRNaW5pRmlsdGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2RlbC5nZXRNaW5pRmlsdGVyKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdEV2ZXJ5dGhpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgbW9kZWwuc2VsZWN0RXZlcnl0aGluZygpO1xuICAgICAgICB9LFxuICAgICAgICBpc0ZpbHRlckFjdGl2ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZWwuaXNGaWx0ZXJBY3RpdmUoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VsZWN0Tm90aGluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBtb2RlbC5zZWxlY3ROb3RoaW5nKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHVuc2VsZWN0VmFsdWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBtb2RlbC51bnNlbGVjdFZhbHVlKHZhbHVlKTtcbiAgICAgICAgICAgIHRoYXQucmVmcmVzaFZpcnR1YWxSb3dzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdFZhbHVlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgbW9kZWwuc2VsZWN0VmFsdWUodmFsdWUpO1xuICAgICAgICAgICAgdGhhdC5yZWZyZXNoVmlydHVhbFJvd3MoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNWYWx1ZVNlbGVjdGVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIG1vZGVsLmlzVmFsdWVTZWxlY3RlZCh2YWx1ZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzRXZlcnl0aGluZ1NlbGVjdGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2RlbC5pc0V2ZXJ5dGhpbmdTZWxlY3RlZCgpO1xuICAgICAgICB9LFxuICAgICAgICBpc05vdGhpbmdTZWxlY3RlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZWwuaXNOb3RoaW5nU2VsZWN0ZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VW5pcXVlVmFsdWVDb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9kZWwuZ2V0VW5pcXVlVmFsdWVDb3VudCgpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRVbmlxdWVWYWx1ZTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2RlbC5nZXRVbmlxdWVWYWx1ZShpbmRleCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldE1vZGVsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBtb2RlbC5nZXRNb2RlbCgpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRNb2RlbDogZnVuY3Rpb24oZGF0YU1vZGVsKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXRNb2RlbChkYXRhTW9kZWwpO1xuICAgICAgICAgICAgdGhhdC5yZWZyZXNoVmlydHVhbFJvd3MoKTtcbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNldEZpbHRlcjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIFNldEZpbHRlck1vZGVsKGNvbERlZiwgcm93TW9kZWwsIHZhbHVlR2V0dGVyKSB7XG4gICAgdGhpcy5jb2xEZWYgPSBjb2xEZWY7XG4gICAgdGhpcy5yb3dNb2RlbCA9IHJvd01vZGVsO1xuICAgIHRoaXMudmFsdWVHZXR0ZXIgPSB2YWx1ZUdldHRlcjtcblxuICAgIHRoaXMuY3JlYXRlVW5pcXVlVmFsdWVzKCk7XG5cbiAgICAvLyBieSBkZWZhdWx0LCBubyBmaWx0ZXIsIHNvIHdlIGRpc3BsYXkgZXZlcnl0aGluZ1xuICAgIHRoaXMuZGlzcGxheWVkVmFsdWVzID0gdGhpcy51bmlxdWVWYWx1ZXM7XG4gICAgdGhpcy5taW5pRmlsdGVyID0gbnVsbDtcbiAgICAvL3dlIHVzZSBhIG1hcCByYXRoZXIgdGhhbiBhbiBhcnJheSBmb3IgdGhlIHNlbGVjdGVkIHZhbHVlcyBhcyB0aGUgbG9va3VwXG4gICAgLy9mb3IgYSBtYXAgaXMgbXVjaCBmYXN0ZXIgdGhhbiB0aGUgbG9va3VwIGZvciBhbiBhcnJheSwgZXNwZWNpYWxseSB3aGVuXG4gICAgLy90aGUgbGVuZ3RoIG9mIHRoZSBhcnJheSBpcyB0aG91c2FuZHMgb2YgcmVjb3JkcyBsb25nXG4gICAgdGhpcy5zZWxlY3RlZFZhbHVlc01hcCA9IHt9O1xuICAgIHRoaXMuc2VsZWN0RXZlcnl0aGluZygpO1xufVxuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUucmVmcmVzaFVuaXF1ZVZhbHVlcyA9IGZ1bmN0aW9uKGtlZXBTZWxlY3Rpb24pIHtcbiAgICB0aGlzLmNyZWF0ZVVuaXF1ZVZhbHVlcygpO1xuXG4gICAgdmFyIG9sZE1vZGVsID0gT2JqZWN0LmtleXModGhpcy5zZWxlY3RlZFZhbHVlc01hcCk7XG5cbiAgICB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwID0ge307XG4gICAgdGhpcy5maWx0ZXJEaXNwbGF5ZWRWYWx1ZXMoKTtcblxuICAgIGlmIChrZWVwU2VsZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuc2V0TW9kZWwob2xkTW9kZWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VsZWN0RXZlcnl0aGluZygpO1xuICAgIH1cbn07XG5cblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5jcmVhdGVVbmlxdWVWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jb2xEZWYuZmlsdGVyUGFyYW1zICYmIHRoaXMuY29sRGVmLmZpbHRlclBhcmFtcy52YWx1ZXMpIHtcbiAgICAgICAgdGhpcy51bmlxdWVWYWx1ZXMgPSB1dGlscy50b1N0cmluZ3ModGhpcy5jb2xEZWYuZmlsdGVyUGFyYW1zLnZhbHVlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51bmlxdWVWYWx1ZXMgPSB1dGlscy50b1N0cmluZ3ModGhpcy5pdGVyYXRlVGhyb3VnaE5vZGVzRm9yVmFsdWVzKCkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbERlZi5jb21wYXJhdG9yKSB7XG4gICAgICAgIHRoaXMudW5pcXVlVmFsdWVzLnNvcnQodGhpcy5jb2xEZWYuY29tcGFyYXRvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy51bmlxdWVWYWx1ZXMuc29ydCh1dGlscy5kZWZhdWx0Q29tcGFyYXRvcik7XG4gICAgfVxufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLml0ZXJhdGVUaHJvdWdoTm9kZXNGb3JWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdW5pcXVlQ2hlY2sgPSB7fTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiByZWN1cnNpdmVseVByb2Nlc3Mobm9kZXMpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIGlmIChub2RlLmdyb3VwICYmICFub2RlLmZvb3Rlcikge1xuICAgICAgICAgICAgICAgIC8vIGdyb3VwIG5vZGUsIHNvIGRpZyBkZWVwZXJcbiAgICAgICAgICAgICAgICByZWN1cnNpdmVseVByb2Nlc3Mobm9kZS5jaGlsZHJlbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IHRoYXQudmFsdWVHZXR0ZXIobm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSBcIlwiIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXVuaXF1ZUNoZWNrLmhhc093blByb3BlcnR5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHVuaXF1ZUNoZWNrW3ZhbHVlXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHRvcExldmVsTm9kZXMgPSB0aGlzLnJvd01vZGVsLmdldFRvcExldmVsTm9kZXMoKTtcbiAgICByZWN1cnNpdmVseVByb2Nlc3ModG9wTGV2ZWxOb2Rlcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy9zZXRzIG1pbmkgZmlsdGVyLiByZXR1cm5zIHRydWUgaWYgaXQgY2hhbmdlZCBmcm9tIGxhc3QgdmFsdWUsIG90aGVyd2lzZSBmYWxzZVxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLnNldE1pbmlGaWx0ZXIgPSBmdW5jdGlvbihuZXdNaW5pRmlsdGVyKSB7XG4gICAgbmV3TWluaUZpbHRlciA9IHV0aWxzLm1ha2VOdWxsKG5ld01pbmlGaWx0ZXIpO1xuICAgIGlmICh0aGlzLm1pbmlGaWx0ZXIgPT09IG5ld01pbmlGaWx0ZXIpIHtcbiAgICAgICAgLy9kbyBub3RoaW5nIGlmIGZpbHRlciBoYXMgbm90IGNoYW5nZWRcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLm1pbmlGaWx0ZXIgPSBuZXdNaW5pRmlsdGVyO1xuICAgIHRoaXMuZmlsdGVyRGlzcGxheWVkVmFsdWVzKCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0TWluaUZpbHRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1pbmlGaWx0ZXI7XG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZmlsdGVyRGlzcGxheWVkVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgbm8gZmlsdGVyLCBqdXN0IHVzZSB0aGUgdW5pcXVlIHZhbHVlc1xuICAgIGlmICh0aGlzLm1pbmlGaWx0ZXIgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5kaXNwbGF5ZWRWYWx1ZXMgPSB0aGlzLnVuaXF1ZVZhbHVlcztcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIGZpbHRlciBwcmVzZW50LCB3ZSBmaWx0ZXIgZG93biB0aGUgbGlzdFxuICAgIHRoaXMuZGlzcGxheWVkVmFsdWVzID0gW107XG4gICAgdmFyIG1pbmlGaWx0ZXJVcHBlckNhc2UgPSB0aGlzLm1pbmlGaWx0ZXIudG9VcHBlckNhc2UoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMudW5pcXVlVmFsdWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgdW5pcXVlVmFsdWUgPSB0aGlzLnVuaXF1ZVZhbHVlc1tpXTtcbiAgICAgICAgaWYgKHVuaXF1ZVZhbHVlICE9PSBudWxsICYmIHVuaXF1ZVZhbHVlLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKS5pbmRleE9mKG1pbmlGaWx0ZXJVcHBlckNhc2UpID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheWVkVmFsdWVzLnB1c2godW5pcXVlVmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0RGlzcGxheWVkVmFsdWVDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmRpc3BsYXllZFZhbHVlcy5sZW5ndGg7XG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuZ2V0RGlzcGxheWVkVmFsdWUgPSBmdW5jdGlvbihpbmRleCkge1xuICAgIHJldHVybiB0aGlzLmRpc3BsYXllZFZhbHVlc1tpbmRleF07XG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuc2VsZWN0RXZlcnl0aGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb3VudCA9IHRoaXMudW5pcXVlVmFsdWVzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy51bmlxdWVWYWx1ZXNbaV07XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXBbdmFsdWVdID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5zZWxlY3RlZFZhbHVlc0NvdW50ID0gY291bnQ7XG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuaXNGaWx0ZXJBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy51bmlxdWVWYWx1ZXMubGVuZ3RoICE9PSB0aGlzLnNlbGVjdGVkVmFsdWVzQ291bnQ7XG59O1xuXG5TZXRGaWx0ZXJNb2RlbC5wcm90b3R5cGUuc2VsZWN0Tm90aGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXAgPSB7fTtcbiAgICB0aGlzLnNlbGVjdGVkVmFsdWVzQ291bnQgPSAwO1xufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLmdldFVuaXF1ZVZhbHVlQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy51bmlxdWVWYWx1ZXMubGVuZ3RoO1xufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLmdldFVuaXF1ZVZhbHVlID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy51bmlxdWVWYWx1ZXNbaW5kZXhdO1xufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLnVuc2VsZWN0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXTtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFZhbHVlc0NvdW50LS07XG4gICAgfVxufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLnNlbGVjdFZhbHVlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodGhpcy5zZWxlY3RlZFZhbHVlc01hcFt2YWx1ZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXSA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRWYWx1ZXNDb3VudCsrO1xuICAgIH1cbn07XG5cblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5pc1ZhbHVlU2VsZWN0ZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnNlbGVjdGVkVmFsdWVzTWFwW3ZhbHVlXSAhPT0gdW5kZWZpbmVkO1xufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLmlzRXZlcnl0aGluZ1NlbGVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudW5pcXVlVmFsdWVzLmxlbmd0aCA9PT0gdGhpcy5zZWxlY3RlZFZhbHVlc0NvdW50O1xufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLmlzTm90aGluZ1NlbGVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudW5pcXVlVmFsdWVzLmxlbmd0aCA9PT0gMDtcbn07XG5cblNldEZpbHRlck1vZGVsLnByb3RvdHlwZS5nZXRNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5pc0ZpbHRlckFjdGl2ZSgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgc2VsZWN0ZWRWYWx1ZXMgPSBbXTtcbiAgICB1dGlscy5pdGVyYXRlT2JqZWN0KHRoaXMuc2VsZWN0ZWRWYWx1ZXNNYXAsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBzZWxlY3RlZFZhbHVlcy5wdXNoKGtleSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNlbGVjdGVkVmFsdWVzO1xufTtcblxuU2V0RmlsdGVyTW9kZWwucHJvdG90eXBlLnNldE1vZGVsID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgdGhpcy5zZWxlY3ROb3RoaW5nKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpPG1vZGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgbmV3VmFsdWUgPSBtb2RlbFtpXTtcbiAgICAgICAgICAgIGlmICh0aGlzLnVuaXF1ZVZhbHVlcy5pbmRleE9mKG5ld1ZhbHVlKT49MCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0VmFsdWUobW9kZWxbaV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1ZhbHVlICcgKyBuZXdWYWx1ZSArICcgaXMgbm90IGEgdmFsaWQgdmFsdWUgZm9yIGZpbHRlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZWxlY3RFdmVyeXRoaW5nKCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXRGaWx0ZXJNb2RlbDtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2PjxkaXY+PHNlbGVjdCBjbGFzcz1hZy1maWx0ZXItc2VsZWN0IGlkPWZpbHRlclR5cGU+PG9wdGlvbiB2YWx1ZT0xPltDT05UQUlOU108L29wdGlvbj48b3B0aW9uIHZhbHVlPTI+W0VRVUFMU108L29wdGlvbj48b3B0aW9uIHZhbHVlPTM+W1NUQVJUUyBXSVRIXTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9ND5bRU5EUyBXSVRIXTwvb3B0aW9uPjwvc2VsZWN0PjwvZGl2PjxkaXY+PGlucHV0IGNsYXNzPWFnLWZpbHRlci1maWx0ZXIgaWQ9ZmlsdGVyVGV4dCB0eXBlPXRleHQgcGxhY2Vob2xkZXI9XFxcIltGSUxURVIuLi5dXFxcIj48L2Rpdj48L2Rpdj5cIjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL3RleHRGaWx0ZXIuaHRtbCcpO1xuXG52YXIgQ09OVEFJTlMgPSAxO1xudmFyIEVRVUFMUyA9IDI7XG52YXIgU1RBUlRTX1dJVEggPSAzO1xudmFyIEVORFNfV0lUSCA9IDQ7XG5cbmZ1bmN0aW9uIFRleHRGaWx0ZXIocGFyYW1zKSB7XG4gICAgdGhpcy5maWx0ZXJQYXJhbXMgPSBwYXJhbXMuZmlsdGVyUGFyYW1zO1xuICAgIHRoaXMuZmlsdGVyQ2hhbmdlZENhbGxiYWNrID0gcGFyYW1zLmZpbHRlckNoYW5nZWRDYWxsYmFjaztcbiAgICB0aGlzLmxvY2FsZVRleHRGdW5jID0gcGFyYW1zLmxvY2FsZVRleHRGdW5jO1xuICAgIHRoaXMudmFsdWVHZXR0ZXIgPSBwYXJhbXMudmFsdWVHZXR0ZXI7XG4gICAgdGhpcy5jcmVhdGVHdWkoKTtcbiAgICB0aGlzLmZpbHRlclRleHQgPSBudWxsO1xuICAgIHRoaXMuZmlsdGVyVHlwZSA9IENPTlRBSU5TO1xuICAgIHRoaXMuY3JlYXRlQXBpKCk7XG59XG5cbi8qIHB1YmxpYyAqL1xuVGV4dEZpbHRlci5wcm90b3R5cGUub25OZXdSb3dzTG9hZGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGtlZXBTZWxlY3Rpb24gPSB0aGlzLmZpbHRlclBhcmFtcyAmJiB0aGlzLmZpbHRlclBhcmFtcy5uZXdSb3dzQWN0aW9uID09PSAna2VlcCc7XG4gICAgaWYgKCFrZWVwU2VsZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuYXBpLnNldFR5cGUoQ09OVEFJTlMpO1xuICAgICAgICB0aGlzLmFwaS5zZXRGaWx0ZXIobnVsbCk7XG4gICAgfVxufTtcblxuLyogcHVibGljICovXG5UZXh0RmlsdGVyLnByb3RvdHlwZS5hZnRlckd1aUF0dGFjaGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5lRmlsdGVyVGV4dEZpZWxkLmZvY3VzKCk7XG59O1xuXG4vKiBwdWJsaWMgKi9cblRleHRGaWx0ZXIucHJvdG90eXBlLmRvZXNGaWx0ZXJQYXNzID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmICghdGhpcy5maWx0ZXJUZXh0KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB2YXIgdmFsdWUgPSB0aGlzLnZhbHVlR2V0dGVyKG5vZGUpO1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgdmFsdWVMb3dlckNhc2UgPSB2YWx1ZS50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk7XG4gICAgc3dpdGNoICh0aGlzLmZpbHRlclR5cGUpIHtcbiAgICAgICAgY2FzZSBDT05UQUlOUzpcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUxvd2VyQ2FzZS5pbmRleE9mKHRoaXMuZmlsdGVyVGV4dCkgPj0gMDtcbiAgICAgICAgY2FzZSBFUVVBTFM6XG4gICAgICAgICAgICByZXR1cm4gdmFsdWVMb3dlckNhc2UgPT09IHRoaXMuZmlsdGVyVGV4dDtcbiAgICAgICAgY2FzZSBTVEFSVFNfV0lUSDpcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUxvd2VyQ2FzZS5pbmRleE9mKHRoaXMuZmlsdGVyVGV4dCkgPT09IDA7XG4gICAgICAgIGNhc2UgRU5EU19XSVRIOlxuICAgICAgICAgICAgdmFyIGluZGV4ID0gdmFsdWVMb3dlckNhc2UuaW5kZXhPZih0aGlzLmZpbHRlclRleHQpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4ID49IDAgJiYgaW5kZXggPT09ICh2YWx1ZUxvd2VyQ2FzZS5sZW5ndGggLSB0aGlzLmZpbHRlclRleHQubGVuZ3RoKTtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIHNob3VsZCBuZXZlciBoYXBwZW5cbiAgICAgICAgICAgIGNvbnNvbGUud2FybignaW52YWxpZCBmaWx0ZXIgdHlwZSAnICsgdGhpcy5maWx0ZXJUeXBlKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vKiBwdWJsaWMgKi9cblRleHRGaWx0ZXIucHJvdG90eXBlLmdldEd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmVHdWk7XG59O1xuXG4vKiBwdWJsaWMgKi9cblRleHRGaWx0ZXIucHJvdG90eXBlLmlzRmlsdGVyQWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyVGV4dCAhPT0gbnVsbDtcbn07XG5cblRleHRGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZVRlbXBsYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRlbXBsYXRlXG4gICAgICAgIC5yZXBsYWNlKCdbRklMVEVSLi4uXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2ZpbHRlck9vbycsICdGaWx0ZXIuLi4nKSlcbiAgICAgICAgLnJlcGxhY2UoJ1tFUVVBTFNdJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnZXF1YWxzJywgJ0VxdWFscycpKVxuICAgICAgICAucmVwbGFjZSgnW0NPTlRBSU5TXScsIHRoaXMubG9jYWxlVGV4dEZ1bmMoJ2NvbnRhaW5zJywgJ0NvbnRhaW5zJykpXG4gICAgICAgIC5yZXBsYWNlKCdbU1RBUlRTIFdJVEhdJywgdGhpcy5sb2NhbGVUZXh0RnVuYygnc3RhcnRzV2l0aCcsICdTdGFydHMgd2l0aCcpKVxuICAgICAgICAucmVwbGFjZSgnW0VORFMgV0lUSF0nLCB0aGlzLmxvY2FsZVRleHRGdW5jKCdlbmRzV2l0aCcsICdFbmRzIHdpdGgnKSlcbjtcbn07XG5cbic8b3B0aW9uIHZhbHVlPVwiMVwiPkNvbnRhaW5zPC9vcHRpb24+JyxcbiAgICAnPG9wdGlvbiB2YWx1ZT1cIjJcIj5FcXVhbHM8L29wdGlvbj4nLFxuICAgICc8b3B0aW9uIHZhbHVlPVwiM1wiPlN0YXJ0cyB3aXRoPC9vcHRpb24+JyxcbiAgICAnPG9wdGlvbiB2YWx1ZT1cIjRcIj5FbmRzIHdpdGg8L29wdGlvbj4nLFxuXG5cblRleHRGaWx0ZXIucHJvdG90eXBlLmNyZWF0ZUd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0aGlzLmNyZWF0ZVRlbXBsYXRlKCkpO1xuICAgIHRoaXMuZUZpbHRlclRleHRGaWVsZCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiI2ZpbHRlclRleHRcIik7XG4gICAgdGhpcy5lVHlwZVNlbGVjdCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKFwiI2ZpbHRlclR5cGVcIik7XG5cbiAgICB1dGlscy5hZGRDaGFuZ2VMaXN0ZW5lcih0aGlzLmVGaWx0ZXJUZXh0RmllbGQsIHRoaXMub25GaWx0ZXJDaGFuZ2VkLmJpbmQodGhpcykpO1xuICAgIHRoaXMuZVR5cGVTZWxlY3QuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCB0aGlzLm9uVHlwZUNoYW5nZWQuYmluZCh0aGlzKSk7XG59O1xuXG5UZXh0RmlsdGVyLnByb3RvdHlwZS5vblR5cGVDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5maWx0ZXJUeXBlID0gcGFyc2VJbnQodGhpcy5lVHlwZVNlbGVjdC52YWx1ZSk7XG4gICAgdGhpcy5maWx0ZXJDaGFuZ2VkQ2FsbGJhY2soKTtcbn07XG5cblRleHRGaWx0ZXIucHJvdG90eXBlLm9uRmlsdGVyQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaWx0ZXJUZXh0ID0gdXRpbHMubWFrZU51bGwodGhpcy5lRmlsdGVyVGV4dEZpZWxkLnZhbHVlKTtcbiAgICBpZiAoZmlsdGVyVGV4dCAmJiBmaWx0ZXJUZXh0LnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgZmlsdGVyVGV4dCA9IG51bGw7XG4gICAgfVxuICAgIGlmIChmaWx0ZXJUZXh0KSB7XG4gICAgICAgIHRoaXMuZmlsdGVyVGV4dCA9IGZpbHRlclRleHQudG9Mb3dlckNhc2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmZpbHRlclRleHQgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLmZpbHRlckNoYW5nZWRDYWxsYmFjaygpO1xufTtcblxuVGV4dEZpbHRlci5wcm90b3R5cGUuY3JlYXRlQXBpID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuYXBpID0ge1xuICAgICAgICBFUVVBTFM6IEVRVUFMUyxcbiAgICAgICAgQ09OVEFJTlM6IENPTlRBSU5TLFxuICAgICAgICBTVEFSVFNfV0lUSDogU1RBUlRTX1dJVEgsXG4gICAgICAgIEVORFNfV0lUSDogRU5EU19XSVRILFxuICAgICAgICBzZXRUeXBlOiBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgICAgICB0aGF0LmZpbHRlclR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgdGhhdC5lVHlwZVNlbGVjdC52YWx1ZSA9IHR5cGU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEZpbHRlcjogZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgICAgICAgICBmaWx0ZXIgPSB1dGlscy5tYWtlTnVsbChmaWx0ZXIpO1xuXG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5maWx0ZXJUZXh0ID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgdGhhdC5lRmlsdGVyVGV4dEZpZWxkLnZhbHVlID0gZmlsdGVyO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGF0LmZpbHRlclRleHQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHRoYXQuZUZpbHRlclRleHRGaWVsZC52YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZmlsdGVyVHlwZTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RmlsdGVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LmZpbHRlclRleHQ7XG4gICAgICAgIH0sXG4gICAgICAgIGdldE1vZGVsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGF0LmlzRmlsdGVyQWN0aXZlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0aGF0LmZpbHRlclR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGZpbHRlcjogdGhhdC5maWx0ZXJUZXh0XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNldE1vZGVsOiBmdW5jdGlvbihkYXRhTW9kZWwpIHtcbiAgICAgICAgICAgIGlmIChkYXRhTW9kZWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFR5cGUoZGF0YU1vZGVsLnR5cGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0RmlsdGVyKGRhdGFNb2RlbC5maWx0ZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEZpbHRlcihudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5UZXh0RmlsdGVyLnByb3RvdHlwZS5nZXRBcGkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5hcGk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHRGaWx0ZXI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbnZhciBHcmlkT3B0aW9uc1dyYXBwZXIgPSByZXF1aXJlKCcuL2dyaWRPcHRpb25zV3JhcHBlcicpO1xudmFyIFNlbGVjdGlvbkNvbnRyb2xsZXIgPSByZXF1aXJlKCcuL3NlbGVjdGlvbkNvbnRyb2xsZXInKTtcbnZhciBGaWx0ZXJNYW5hZ2VyID0gcmVxdWlyZSgnLi9maWx0ZXIvZmlsdGVyTWFuYWdlcicpO1xudmFyIFNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSA9IHJlcXVpcmUoJy4vc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5Jyk7XG52YXIgQ29sdW1uQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vY29sdW1uQ29udHJvbGxlcicpO1xudmFyIFJvd1JlbmRlcmVyID0gcmVxdWlyZSgnLi9yb3dSZW5kZXJlcicpO1xudmFyIEhlYWRlclJlbmRlcmVyID0gcmVxdWlyZSgnLi9oZWFkZXJSZW5kZXJlcicpO1xudmFyIEluTWVtb3J5Um93Q29udHJvbGxlciA9IHJlcXVpcmUoJy4vcm93Q29udHJvbGxlcnMvaW5NZW1vcnlSb3dDb250cm9sbGVyJyk7XG52YXIgVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyID0gcmVxdWlyZSgnLi9yb3dDb250cm9sbGVycy92aXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXInKTtcbnZhciBQYWdpbmF0aW9uQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vcm93Q29udHJvbGxlcnMvcGFnaW5hdGlvbkNvbnRyb2xsZXInKTtcbnZhciBFeHByZXNzaW9uU2VydmljZSA9IHJlcXVpcmUoJy4vZXhwcmVzc2lvblNlcnZpY2UnKTtcbnZhciBUZW1wbGF0ZVNlcnZpY2UgPSByZXF1aXJlKCcuL3RlbXBsYXRlU2VydmljZScpO1xudmFyIFRvb2xQYW5lbCA9IHJlcXVpcmUoJy4vdG9vbFBhbmVsL3Rvb2xQYW5lbCcpO1xudmFyIEJvcmRlckxheW91dCA9IHJlcXVpcmUoJy4vbGF5b3V0L2JvcmRlckxheW91dCcpO1xudmFyIEdyaWRQYW5lbCA9IHJlcXVpcmUoJy4vZ3JpZFBhbmVsL2dyaWRQYW5lbCcpO1xuXG5mdW5jdGlvbiBHcmlkKGVHcmlkRGl2LCBncmlkT3B0aW9ucywgJHNjb3BlLCAkY29tcGlsZSwgcXVpY2tGaWx0ZXJPblNjb3BlKSB7XG5cbiAgICB0aGlzLmdyaWRPcHRpb25zID0gZ3JpZE9wdGlvbnM7XG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBuZXcgR3JpZE9wdGlvbnNXcmFwcGVyKHRoaXMuZ3JpZE9wdGlvbnMpO1xuXG4gICAgdGhpcy5zZXR1cENvbXBvbmVudHMoJHNjb3BlLCAkY29tcGlsZSwgZUdyaWREaXYpO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMucXVpY2tGaWx0ZXIgPSBudWxsO1xuXG4gICAgLy8gaWYgdXNpbmcgYW5ndWxhciwgd2F0Y2ggZm9yIHF1aWNrRmlsdGVyIGNoYW5nZXNcbiAgICBpZiAoJHNjb3BlKSB7XG4gICAgICAgICRzY29wZS4kd2F0Y2gocXVpY2tGaWx0ZXJPblNjb3BlLCBmdW5jdGlvbihuZXdGaWx0ZXIpIHtcbiAgICAgICAgICAgIHRoYXQub25RdWlja0ZpbHRlckNoYW5nZWQobmV3RmlsdGVyKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy52aXJ0dWFsUm93Q2FsbGJhY2tzID0ge307XG5cbiAgICB2YXIgZm9yUHJpbnQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0RvbnRVc2VTY3JvbGxzKCk7XG4gICAgdGhpcy5hZGRBcGkoKTtcblxuICAgIHRoaXMuc2Nyb2xsV2lkdGggPSB1dGlscy5nZXRTY3JvbGxiYXJXaWR0aCgpO1xuXG4gICAgLy8gZG9uZSB3aGVuIGNvbHMgY2hhbmdlXG4gICAgdGhpcy5zZXR1cENvbHVtbnMoKTtcblxuICAgIHRoaXMuaW5NZW1vcnlSb3dDb250cm9sbGVyLnNldEFsbFJvd3ModGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QWxsUm93cygpKTtcblxuICAgIGlmICghZm9yUHJpbnQpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuZG9MYXlvdXQuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVNb2RlbEFuZFJlZnJlc2goY29uc3RhbnRzLlNURVBfRVZFUllUSElORyk7XG5cbiAgICAvLyBpZiBubyBkYXRhIHByb3ZpZGVkIGluaXRpYWxseSwgYW5kIG5vdCBkb2luZyBpbmZpbml0ZSBzY3JvbGxpbmcsIHNob3cgdGhlIGxvYWRpbmcgcGFuZWxcbiAgICB2YXIgc2hvd0xvYWRpbmcgPSAhdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QWxsUm93cygpICYmICF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc1ZpcnR1YWxQYWdpbmcoKTtcbiAgICB0aGlzLnNob3dMb2FkaW5nUGFuZWwoc2hvd0xvYWRpbmcpO1xuXG4gICAgLy8gaWYgZGF0YXNvdXJjZSBwcm92aWRlZCwgdXNlIGl0XG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldERhdGFzb3VyY2UoKSkge1xuICAgICAgICB0aGlzLnNldERhdGFzb3VyY2UoKTtcbiAgICB9XG5cbiAgICB0aGlzLmRvTGF5b3V0KCk7XG5cbiAgICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XG4gICAgdGhpcy5wZXJpb2RpY2FsbHlEb0xheW91dCgpO1xuXG4gICAgLy8gaWYgcmVhZHkgZnVuY3Rpb24gcHJvdmlkZWQsIHVzZSBpdFxuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0UmVhZHkoKSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJlYWR5KCkoZ3JpZE9wdGlvbnMuYXBpKTtcbiAgICB9XG59XG5cbkdyaWQucHJvdG90eXBlLnBlcmlvZGljYWxseURvTGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmZpbmlzaGVkKSB7XG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuZG9MYXlvdXQoKTtcbiAgICAgICAgICAgIHRoYXQucGVyaW9kaWNhbGx5RG9MYXlvdXQoKTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXR1cENvbXBvbmVudHMgPSBmdW5jdGlvbigkc2NvcGUsICRjb21waWxlLCBlVXNlclByb3ZpZGVkRGl2KSB7XG5cbiAgICAvLyBtYWtlIGxvY2FsIHJlZmVyZW5jZXMsIHRvIG1ha2UgdGhlIGJlbG93IG1vcmUgaHVtYW4gcmVhZGFibGVcbiAgICB2YXIgZ3JpZE9wdGlvbnNXcmFwcGVyID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXI7XG4gICAgdmFyIGdyaWRPcHRpb25zID0gdGhpcy5ncmlkT3B0aW9ucztcbiAgICB2YXIgZm9yUHJpbnQgPSBncmlkT3B0aW9uc1dyYXBwZXIuaXNEb250VXNlU2Nyb2xscygpO1xuXG4gICAgLy8gY3JlYXRlIGFsbCB0aGUgYmVhbnNcbiAgICB2YXIgc2VsZWN0aW9uQ29udHJvbGxlciA9IG5ldyBTZWxlY3Rpb25Db250cm9sbGVyKCk7XG4gICAgdmFyIGZpbHRlck1hbmFnZXIgPSBuZXcgRmlsdGVyTWFuYWdlcigpO1xuICAgIHZhciBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkgPSBuZXcgU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5KCk7XG4gICAgdmFyIGNvbHVtbkNvbnRyb2xsZXIgPSBuZXcgQ29sdW1uQ29udHJvbGxlcigpO1xuICAgIHZhciByb3dSZW5kZXJlciA9IG5ldyBSb3dSZW5kZXJlcigpO1xuICAgIHZhciBoZWFkZXJSZW5kZXJlciA9IG5ldyBIZWFkZXJSZW5kZXJlcigpO1xuICAgIHZhciBpbk1lbW9yeVJvd0NvbnRyb2xsZXIgPSBuZXcgSW5NZW1vcnlSb3dDb250cm9sbGVyKCk7XG4gICAgdmFyIHZpcnR1YWxQYWdlUm93Q29udHJvbGxlciA9IG5ldyBWaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIoKTtcbiAgICB2YXIgZXhwcmVzc2lvblNlcnZpY2UgPSBuZXcgRXhwcmVzc2lvblNlcnZpY2UoKTtcbiAgICB2YXIgdGVtcGxhdGVTZXJ2aWNlID0gbmV3IFRlbXBsYXRlU2VydmljZSgpO1xuICAgIHZhciBncmlkUGFuZWwgPSBuZXcgR3JpZFBhbmVsKGdyaWRPcHRpb25zV3JhcHBlcik7XG5cbiAgICB2YXIgY29sdW1uTW9kZWwgPSBjb2x1bW5Db250cm9sbGVyLmdldE1vZGVsKCk7XG5cbiAgICAvLyBpbml0aWFsaXNlIGFsbCB0aGUgYmVhbnNcbiAgICB0ZW1wbGF0ZVNlcnZpY2UuaW5pdCgkc2NvcGUpO1xuICAgIHNlbGVjdGlvbkNvbnRyb2xsZXIuaW5pdCh0aGlzLCBncmlkUGFuZWwsIGdyaWRPcHRpb25zV3JhcHBlciwgJHNjb3BlLCByb3dSZW5kZXJlcik7XG4gICAgZmlsdGVyTWFuYWdlci5pbml0KHRoaXMsIGdyaWRPcHRpb25zV3JhcHBlciwgJGNvbXBpbGUsICRzY29wZSwgZXhwcmVzc2lvblNlcnZpY2UsIGNvbHVtbk1vZGVsKTtcbiAgICBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkuaW5pdCh0aGlzLCBzZWxlY3Rpb25Db250cm9sbGVyKTtcbiAgICBjb2x1bW5Db250cm9sbGVyLmluaXQodGhpcywgc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LCBncmlkT3B0aW9uc1dyYXBwZXIsIGV4cHJlc3Npb25TZXJ2aWNlKTtcbiAgICByb3dSZW5kZXJlci5pbml0KGdyaWRPcHRpb25zLCBjb2x1bW5Nb2RlbCwgZ3JpZE9wdGlvbnNXcmFwcGVyLCBncmlkUGFuZWwsIHRoaXMsXG4gICAgICAgIHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSwgJGNvbXBpbGUsICRzY29wZSwgc2VsZWN0aW9uQ29udHJvbGxlciwgZXhwcmVzc2lvblNlcnZpY2UsIHRlbXBsYXRlU2VydmljZSk7XG4gICAgaGVhZGVyUmVuZGVyZXIuaW5pdChncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbkNvbnRyb2xsZXIsIGNvbHVtbk1vZGVsLCBncmlkUGFuZWwsIHRoaXMsIGZpbHRlck1hbmFnZXIsXG4gICAgICAgICRzY29wZSwgJGNvbXBpbGUsIGV4cHJlc3Npb25TZXJ2aWNlKTtcbiAgICBpbk1lbW9yeVJvd0NvbnRyb2xsZXIuaW5pdChncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbk1vZGVsLCB0aGlzLCBmaWx0ZXJNYW5hZ2VyLCAkc2NvcGUsIGV4cHJlc3Npb25TZXJ2aWNlKTtcbiAgICB2aXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIuaW5pdChyb3dSZW5kZXJlciwgZ3JpZE9wdGlvbnNXcmFwcGVyLCB0aGlzKTtcbiAgICBncmlkUGFuZWwuaW5pdChjb2x1bW5Nb2RlbCwgcm93UmVuZGVyZXIpO1xuXG4gICAgdmFyIHRvb2xQYW5lbExheW91dCA9IG51bGw7XG4gICAgdmFyIGVUb29sUGFuZWwgPSBudWxsO1xuICAgIGlmICghZm9yUHJpbnQpIHtcbiAgICAgICAgZVRvb2xQYW5lbCA9IG5ldyBUb29sUGFuZWwoKTtcbiAgICAgICAgdG9vbFBhbmVsTGF5b3V0ID0gZVRvb2xQYW5lbC5sYXlvdXQ7XG4gICAgICAgIGVUb29sUGFuZWwuaW5pdChjb2x1bW5Db250cm9sbGVyLCBpbk1lbW9yeVJvd0NvbnRyb2xsZXIsIGdyaWRPcHRpb25zV3JhcHBlcik7XG4gICAgfVxuXG4gICAgLy8gdGhpcyBpcyBhIGNoaWxkIGJlYW4sIGdldCBhIHJlZmVyZW5jZSBhbmQgcGFzcyBpdCBvblxuICAgIC8vIENBTiBXRSBERUxFVEUgVEhJUz8gaXQncyBkb25lIGluIHRoZSBzZXREYXRhc291cmNlIHNlY3Rpb25cbiAgICB2YXIgcm93TW9kZWwgPSBpbk1lbW9yeVJvd0NvbnRyb2xsZXIuZ2V0TW9kZWwoKTtcbiAgICBzZWxlY3Rpb25Db250cm9sbGVyLnNldFJvd01vZGVsKHJvd01vZGVsKTtcbiAgICBmaWx0ZXJNYW5hZ2VyLnNldFJvd01vZGVsKHJvd01vZGVsKTtcbiAgICByb3dSZW5kZXJlci5zZXRSb3dNb2RlbChyb3dNb2RlbCk7XG4gICAgZ3JpZFBhbmVsLnNldFJvd01vZGVsKHJvd01vZGVsKTtcblxuICAgIC8vIGFuZCB0aGUgbGFzdCBiZWFuLCBkb25lIGluIGl0J3Mgb3duIHNlY3Rpb24sIGFzIGl0J3Mgb3B0aW9uYWxcbiAgICB2YXIgcGFnaW5hdGlvbkNvbnRyb2xsZXIgPSBudWxsO1xuICAgIHZhciBwYWdpbmF0aW9uR3VpID0gbnVsbDtcbiAgICBpZiAoIWZvclByaW50KSB7XG4gICAgICAgIHBhZ2luYXRpb25Db250cm9sbGVyID0gbmV3IFBhZ2luYXRpb25Db250cm9sbGVyKCk7XG4gICAgICAgIHBhZ2luYXRpb25Db250cm9sbGVyLmluaXQodGhpcywgZ3JpZE9wdGlvbnNXcmFwcGVyKTtcbiAgICAgICAgcGFnaW5hdGlvbkd1aSA9IHBhZ2luYXRpb25Db250cm9sbGVyLmdldEd1aSgpO1xuICAgIH1cblxuICAgIHRoaXMucm93TW9kZWwgPSByb3dNb2RlbDtcbiAgICB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIgPSBzZWxlY3Rpb25Db250cm9sbGVyO1xuICAgIHRoaXMuY29sdW1uQ29udHJvbGxlciA9IGNvbHVtbkNvbnRyb2xsZXI7XG4gICAgdGhpcy5jb2x1bW5Nb2RlbCA9IGNvbHVtbk1vZGVsO1xuICAgIHRoaXMuaW5NZW1vcnlSb3dDb250cm9sbGVyID0gaW5NZW1vcnlSb3dDb250cm9sbGVyO1xuICAgIHRoaXMudmlydHVhbFBhZ2VSb3dDb250cm9sbGVyID0gdmlydHVhbFBhZ2VSb3dDb250cm9sbGVyO1xuICAgIHRoaXMucm93UmVuZGVyZXIgPSByb3dSZW5kZXJlcjtcbiAgICB0aGlzLmhlYWRlclJlbmRlcmVyID0gaGVhZGVyUmVuZGVyZXI7XG4gICAgdGhpcy5wYWdpbmF0aW9uQ29udHJvbGxlciA9IHBhZ2luYXRpb25Db250cm9sbGVyO1xuICAgIHRoaXMuZmlsdGVyTWFuYWdlciA9IGZpbHRlck1hbmFnZXI7XG4gICAgdGhpcy5lVG9vbFBhbmVsID0gZVRvb2xQYW5lbDtcbiAgICB0aGlzLmdyaWRQYW5lbCA9IGdyaWRQYW5lbDtcblxuICAgIHRoaXMuZVJvb3RQYW5lbCA9IG5ldyBCb3JkZXJMYXlvdXQoe1xuICAgICAgICBjZW50ZXI6IGdyaWRQYW5lbC5sYXlvdXQsXG4gICAgICAgIGVhc3Q6IHRvb2xQYW5lbExheW91dCxcbiAgICAgICAgc291dGg6IHBhZ2luYXRpb25HdWksXG4gICAgICAgIGRvbnRGaWxsOiBmb3JQcmludCxcbiAgICAgICAgbmFtZTogJ2VSb290UGFuZWwnXG4gICAgfSk7XG5cbiAgICAvLyBkZWZhdWx0IGlzIHdlIGRvbid0IHNob3cgcGFnaW5nIHBhbmVsLCB0aGlzIGlzIHNldCB0byB0cnVlIHdoZW4gZGF0YXNvdXJjZSBpcyBzZXRcbiAgICB0aGlzLmVSb290UGFuZWwuc2V0U291dGhWaXNpYmxlKGZhbHNlKTtcblxuICAgIC8vIHNlZSB3aGF0IHRoZSBncmlkIG9wdGlvbnMgYXJlIGZvciBkZWZhdWx0IG9mIHRvb2xiYXJcbiAgICB0aGlzLnNob3dUb29sUGFuZWwoZ3JpZE9wdGlvbnNXcmFwcGVyLmlzU2hvd1Rvb2xQYW5lbCgpKTtcblxuICAgIGVVc2VyUHJvdmlkZWREaXYuYXBwZW5kQ2hpbGQodGhpcy5lUm9vdFBhbmVsLmdldEd1aSgpKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnNob3dUb29sUGFuZWwgPSBmdW5jdGlvbihzaG93KSB7XG4gICAgaWYgKCF0aGlzLmVUb29sUGFuZWwpIHtcbiAgICAgICAgdGhpcy50b29sUGFuZWxTaG93aW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnRvb2xQYW5lbFNob3dpbmcgPSBzaG93O1xuICAgIHRoaXMuZVJvb3RQYW5lbC5zZXRFYXN0VmlzaWJsZShzaG93KTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmlzVG9vbFBhbmVsU2hvd2luZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnRvb2xQYW5lbFNob3dpbmc7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXREYXRhc291cmNlID0gZnVuY3Rpb24oZGF0YXNvdXJjZSkge1xuICAgIC8vIGlmIGRhdGFzb3VyY2UgcHJvdmlkZWQsIHRoZW4gc2V0IGl0XG4gICAgaWYgKGRhdGFzb3VyY2UpIHtcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9ucy5kYXRhc291cmNlID0gZGF0YXNvdXJjZTtcbiAgICB9XG4gICAgLy8gZ2V0IHRoZSBzZXQgZGF0YXNvdXJjZSAoaWYgbnVsbCB3YXMgcGFzc2VkIHRvIHRoaXMgbWV0aG9kLFxuICAgIC8vIHRoZW4gbmVlZCB0byBnZXQgdGhlIGFjdHVhbCBkYXRhc291cmNlIGZyb20gb3B0aW9uc1xuICAgIHZhciBkYXRhc291cmNlVG9Vc2UgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXREYXRhc291cmNlKCk7XG4gICAgdGhpcy5kb2luZ1ZpcnR1YWxQYWdpbmcgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc1ZpcnR1YWxQYWdpbmcoKSAmJiBkYXRhc291cmNlVG9Vc2U7XG4gICAgdGhpcy5kb2luZ1BhZ2luYXRpb24gPSBkYXRhc291cmNlVG9Vc2UgJiYgIXRoaXMuZG9pbmdWaXJ0dWFsUGFnaW5nO1xuICAgIHZhciBzaG93UGFnaW5nUGFuZWw7XG5cbiAgICBpZiAodGhpcy5kb2luZ1ZpcnR1YWxQYWdpbmcpIHtcbiAgICAgICAgdGhpcy5wYWdpbmF0aW9uQ29udHJvbGxlci5zZXREYXRhc291cmNlKG51bGwpO1xuICAgICAgICB0aGlzLnZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5zZXREYXRhc291cmNlKGRhdGFzb3VyY2VUb1VzZSk7XG4gICAgICAgIHRoaXMucm93TW9kZWwgPSB0aGlzLnZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5nZXRNb2RlbCgpO1xuICAgICAgICBzaG93UGFnaW5nUGFuZWwgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuZG9pbmdQYWdpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMucGFnaW5hdGlvbkNvbnRyb2xsZXIuc2V0RGF0YXNvdXJjZShkYXRhc291cmNlVG9Vc2UpO1xuICAgICAgICB0aGlzLnZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5zZXREYXRhc291cmNlKG51bGwpO1xuICAgICAgICB0aGlzLnJvd01vZGVsID0gdGhpcy5pbk1lbW9yeVJvd0NvbnRyb2xsZXIuZ2V0TW9kZWwoKTtcbiAgICAgICAgc2hvd1BhZ2luZ1BhbmVsID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBhZ2luYXRpb25Db250cm9sbGVyLnNldERhdGFzb3VyY2UobnVsbCk7XG4gICAgICAgIHRoaXMudmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnNldERhdGFzb3VyY2UobnVsbCk7XG4gICAgICAgIHRoaXMucm93TW9kZWwgPSB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci5nZXRNb2RlbCgpO1xuICAgICAgICBzaG93UGFnaW5nUGFuZWwgPSBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIuc2V0Um93TW9kZWwodGhpcy5yb3dNb2RlbCk7XG4gICAgdGhpcy5maWx0ZXJNYW5hZ2VyLnNldFJvd01vZGVsKHRoaXMucm93TW9kZWwpO1xuICAgIHRoaXMucm93UmVuZGVyZXIuc2V0Um93TW9kZWwodGhpcy5yb3dNb2RlbCk7XG5cbiAgICB0aGlzLmVSb290UGFuZWwuc2V0U291dGhWaXNpYmxlKHNob3dQYWdpbmdQYW5lbCk7XG5cbiAgICAvLyBiZWNhdXNlIHdlIGp1c3Qgc2V0IHRoZSByb3dNb2RlbCwgbmVlZCB0byB1cGRhdGUgdGhlIGd1aVxuICAgIHRoaXMucm93UmVuZGVyZXIucmVmcmVzaFZpZXcoKTtcblxuICAgIHRoaXMuZG9MYXlvdXQoKTtcbn07XG5cbi8vIGdldHMgY2FsbGVkIGFmdGVyIGNvbHVtbnMgYXJlIHNob3duIC8gaGlkZGVuIGZyb20gZ3JvdXBzIGV4cGFuZGluZ1xuR3JpZC5wcm90b3R5cGUucmVmcmVzaEhlYWRlckFuZEJvZHkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmhlYWRlclJlbmRlcmVyLnJlZnJlc2hIZWFkZXIoKTtcbiAgICB0aGlzLmhlYWRlclJlbmRlcmVyLnVwZGF0ZUZpbHRlckljb25zKCk7XG4gICAgdGhpcy5oZWFkZXJSZW5kZXJlci51cGRhdGVTb3J0SWNvbnMoKTtcbiAgICB0aGlzLmdyaWRQYW5lbC5zZXRCb2R5Q29udGFpbmVyV2lkdGgoKTtcbiAgICB0aGlzLmdyaWRQYW5lbC5zZXRQaW5uZWRDb2xDb250YWluZXJXaWR0aCgpO1xuICAgIHRoaXMucm93UmVuZGVyZXIucmVmcmVzaFZpZXcoKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnNldEZpbmlzaGVkID0gZnVuY3Rpb24oKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuZG9MYXlvdXQpO1xuICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0UG9wdXBQYXJlbnQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5lUm9vdFBhbmVsLmdldEd1aSgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0UXVpY2tGaWx0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWlja0ZpbHRlcjtcbn07XG5cbkdyaWQucHJvdG90eXBlLm9uUXVpY2tGaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24obmV3RmlsdGVyKSB7XG4gICAgaWYgKG5ld0ZpbHRlciA9PT0gdW5kZWZpbmVkIHx8IG5ld0ZpbHRlciA9PT0gXCJcIikge1xuICAgICAgICBuZXdGaWx0ZXIgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5xdWlja0ZpbHRlciAhPT0gbmV3RmlsdGVyKSB7XG4gICAgICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc1ZpcnR1YWxQYWdpbmcoKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdhZy1ncmlkOiBjYW5ub3QgZG8gcXVpY2sgZmlsdGVyaW5nIHdoZW4gZG9pbmcgdmlydHVhbCBwYWdpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vd2FudCAnbnVsbCcgdG8gbWVhbiB0byBmaWx0ZXIsIHNvIHJlbW92ZSB1bmRlZmluZWQgYW5kIGVtcHR5IHN0cmluZ1xuICAgICAgICBpZiAobmV3RmlsdGVyID09PSB1bmRlZmluZWQgfHwgbmV3RmlsdGVyID09PSBcIlwiKSB7XG4gICAgICAgICAgICBuZXdGaWx0ZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdGaWx0ZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIG5ld0ZpbHRlciA9IG5ld0ZpbHRlci50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucXVpY2tGaWx0ZXIgPSBuZXdGaWx0ZXI7XG4gICAgICAgIHRoaXMub25GaWx0ZXJDaGFuZ2VkKCk7XG4gICAgfVxufTtcblxuR3JpZC5wcm90b3R5cGUub25GaWx0ZXJDaGFuZ2VkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5oZWFkZXJSZW5kZXJlci51cGRhdGVGaWx0ZXJJY29ucygpO1xuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZVNlcnZlclNpZGVGaWx0ZXIoKSkge1xuICAgICAgICAvLyBpZiBkb2luZyBzZXJ2ZXIgc2lkZSBmaWx0ZXJpbmcsIGNoYW5naW5nIHRoZSBzb3J0IGhhcyB0aGUgaW1wYWN0XG4gICAgICAgIC8vIG9mIHJlc2V0dGluZyB0aGUgZGF0YXNvdXJjZVxuICAgICAgICB0aGlzLnNldERhdGFzb3VyY2UoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiBkb2luZyBpbiBtZW1vcnkgZmlsdGVyaW5nLCB3ZSBqdXN0IHVwZGF0ZSB0aGUgaW4gbWVtb3J5IGRhdGFcbiAgICAgICAgdGhpcy51cGRhdGVNb2RlbEFuZFJlZnJlc2goY29uc3RhbnRzLlNURVBfRklMVEVSKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5vblJvd0NsaWNrZWQgPSBmdW5jdGlvbihldmVudCwgcm93SW5kZXgsIG5vZGUpIHtcblxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zLnJvd0NsaWNrZWQpIHtcbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXG4gICAgICAgICAgICBldmVudDogZXZlbnQsXG4gICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXhcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9ucy5yb3dDbGlja2VkKHBhcmFtcyk7XG4gICAgfVxuXG4gICAgLy8gd2UgZG8gbm90IGFsbG93IHNlbGVjdGluZyBncm91cHMgYnkgY2xpY2tpbmcgKGFzIHRoZSBjbGljayBoZXJlIGV4cGFuZHMgdGhlIGdyb3VwKVxuICAgIC8vIHNvIHJldHVybiBpZiBpdCdzIGEgZ3JvdXAgcm93XG4gICAgaWYgKG5vZGUuZ3JvdXApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIG1ha2luZyBsb2NhbCB2YXJpYWJsZXMgdG8gbWFrZSB0aGUgYmVsb3cgbW9yZSByZWFkYWJsZVxuICAgIHZhciBncmlkT3B0aW9uc1dyYXBwZXIgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlcjtcbiAgICB2YXIgc2VsZWN0aW9uQ29udHJvbGxlciA9IHRoaXMuc2VsZWN0aW9uQ29udHJvbGxlcjtcblxuICAgIC8vIGlmIG5vIHNlbGVjdGlvbiBtZXRob2QgZW5hYmxlZCwgZG8gbm90aGluZ1xuICAgIGlmICghZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93U2VsZWN0aW9uKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIGNsaWNrIHNlbGVjdGlvbiBzdXBwcmVzc2VkLCBkbyBub3RoaW5nXG4gICAgaWYgKGdyaWRPcHRpb25zV3JhcHBlci5pc1N1cHByZXNzUm93Q2xpY2tTZWxlY3Rpb24oKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gY3RybEtleSBmb3Igd2luZG93cywgbWV0YUtleSBmb3IgQXBwbGVcbiAgICB2YXIgY3RybEtleVByZXNzZWQgPSBldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXk7XG5cbiAgICB2YXIgZG9EZXNlbGVjdCA9IGN0cmxLZXlQcmVzc2VkXG4gICAgICAgICYmIHNlbGVjdGlvbkNvbnRyb2xsZXIuaXNOb2RlU2VsZWN0ZWQobm9kZSlcbiAgICAgICAgJiYgZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93RGVzZWxlY3Rpb24oKSA7XG5cbiAgICBpZiAoZG9EZXNlbGVjdCkge1xuICAgICAgICBzZWxlY3Rpb25Db250cm9sbGVyLmRlc2VsZWN0Tm9kZShub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgdHJ5TXVsdGkgPSBjdHJsS2V5UHJlc3NlZDtcbiAgICAgICAgc2VsZWN0aW9uQ29udHJvbGxlci5zZWxlY3ROb2RlKG5vZGUsIHRyeU11bHRpKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zaG93TG9hZGluZ1BhbmVsID0gZnVuY3Rpb24oc2hvdykge1xuICAgIHRoaXMuZ3JpZFBhbmVsLnNob3dMb2FkaW5nKHNob3cpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0dXBDb2x1bW5zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5ncmlkUGFuZWwuc2V0SGVhZGVySGVpZ2h0KCk7XG4gICAgdGhpcy5jb2x1bW5Db250cm9sbGVyLnNldENvbHVtbnModGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29sdW1uRGVmcygpKTtcbiAgICB0aGlzLmdyaWRQYW5lbC5zaG93UGlubmVkQ29sQ29udGFpbmVyc0lmTmVlZGVkKCk7XG4gICAgdGhpcy5oZWFkZXJSZW5kZXJlci5yZWZyZXNoSGVhZGVyKCk7XG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0RvbnRVc2VTY3JvbGxzKCkpIHtcbiAgICAgICAgdGhpcy5ncmlkUGFuZWwuc2V0UGlubmVkQ29sQ29udGFpbmVyV2lkdGgoKTtcbiAgICAgICAgdGhpcy5ncmlkUGFuZWwuc2V0Qm9keUNvbnRhaW5lcldpZHRoKCk7XG4gICAgfVxuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlRmlsdGVySWNvbnMoKTtcbn07XG5cbi8vIHJvd3NUb1JlZnJlc2ggaXMgYXQgd2hhdCBpbmRleCB0byBzdGFydCByZWZyZXNoaW5nIHRoZSByb3dzLiB0aGUgYXNzdW1wdGlvbiBpc1xuLy8gaWYgd2UgYXJlIGV4cGFuZGluZyBvciBjb2xsYXBzaW5nIGEgZ3JvdXAsIHRoZW4gb25seSBoZSByb3dzIGJlbG93IHRoZSBncm91cFxuLy8gbmVlZCB0byBiZSByZWZyZXNoLiB0aGlzIGFsbG93cyB0aGUgY29udGV4dCAoZWcgZm9jdXMpIG9mIHRoZSBvdGhlciBjZWxscyB0b1xuLy8gcmVtYWluLlxuR3JpZC5wcm90b3R5cGUudXBkYXRlTW9kZWxBbmRSZWZyZXNoID0gZnVuY3Rpb24oc3RlcCwgcmVmcmVzaEZyb21JbmRleCkge1xuICAgIHRoaXMuaW5NZW1vcnlSb3dDb250cm9sbGVyLnVwZGF0ZU1vZGVsKHN0ZXApO1xuICAgIHRoaXMucm93UmVuZGVyZXIucmVmcmVzaFZpZXcocmVmcmVzaEZyb21JbmRleCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRSb3dzID0gZnVuY3Rpb24ocm93cywgZmlyc3RJZCkge1xuICAgIGlmIChyb3dzKSB7XG4gICAgICAgIHRoaXMuZ3JpZE9wdGlvbnMucm93RGF0YSA9IHJvd3M7XG4gICAgfVxuICAgIHRoaXMuaW5NZW1vcnlSb3dDb250cm9sbGVyLnNldEFsbFJvd3ModGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QWxsUm93cygpLCBmaXJzdElkKTtcbiAgICB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3RBbGwoKTtcbiAgICB0aGlzLmZpbHRlck1hbmFnZXIub25OZXdSb3dzTG9hZGVkKCk7XG4gICAgdGhpcy51cGRhdGVNb2RlbEFuZFJlZnJlc2goY29uc3RhbnRzLlNURVBfRVZFUllUSElORyk7XG4gICAgdGhpcy5oZWFkZXJSZW5kZXJlci51cGRhdGVGaWx0ZXJJY29ucygpO1xuICAgIHRoaXMuc2hvd0xvYWRpbmdQYW5lbChmYWxzZSk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5lbnN1cmVOb2RlVmlzaWJsZSA9IGZ1bmN0aW9uKGNvbXBhcmF0b3IpIHtcbiAgICBpZiAodGhpcy5kb2luZ1ZpcnR1YWxQYWdpbmcpIHtcbiAgICAgICAgdGhyb3cgJ0Nhbm5vdCB1c2UgZW5zdXJlTm9kZVZpc2libGUgd2hlbiBkb2luZyB2aXJ0dWFsIHBhZ2luZywgYXMgd2UgY2Fubm90IGNoZWNrIHJvd3MgdGhhdCBhcmUgbm90IGluIG1lbW9yeSc7XG4gICAgfVxuICAgIC8vIGxvb2sgZm9yIHRoZSBub2RlIGluZGV4IHdlIHdhbnQgdG8gZGlzcGxheVxuICAgIHZhciByb3dDb3VudCA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvd0NvdW50KCk7XG4gICAgdmFyIGNvbXBhcmF0b3JJc0FGdW5jdGlvbiA9IHR5cGVvZiBjb21wYXJhdG9yID09PSAnZnVuY3Rpb24nO1xuICAgIHZhciBpbmRleFRvU2VsZWN0ID0gLTE7XG4gICAgLy8gZ28gdGhyb3VnaCBhbGwgdGhlIG5vZGVzLCBmaW5kIHRoZSBvbmUgd2Ugd2FudCB0byBzaG93XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByb3dDb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93KGkpO1xuICAgICAgICBpZiAoY29tcGFyYXRvcklzQUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICBpZiAoY29tcGFyYXRvcihub2RlKSkge1xuICAgICAgICAgICAgICAgIGluZGV4VG9TZWxlY3QgPSBpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gY2hlY2sgb2JqZWN0IGVxdWFsaXR5IGFnYWluc3Qgbm9kZSBhbmQgZGF0YVxuICAgICAgICAgICAgaWYgKGNvbXBhcmF0b3IgPT09IG5vZGUgfHwgY29tcGFyYXRvciA9PT0gbm9kZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgaW5kZXhUb1NlbGVjdCA9IGk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGluZGV4VG9TZWxlY3QgPj0gMCkge1xuICAgICAgICB0aGlzLmdyaWRQYW5lbC5lbnN1cmVJbmRleFZpc2libGUoaW5kZXhUb1NlbGVjdCk7XG4gICAgfVxufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0RmlsdGVyTW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXJNYW5hZ2VyLmdldEZpbHRlck1vZGVsKCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5hZGRBcGkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgLy8gSEIgRXh0ZW5zaW9uXG4gICAgICAgIGdldENvbHVtbkNvbnRyb2xsZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuY29sdW1uQ29udHJvbGxlcjtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gSEIgRXh0ZW5zaW9uXG4gICAgICAgIGdldFJvd1JlbmRlcmVyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnJvd1JlbmRlcmVyO1xuICAgICAgICB9LFxuICAgICAgICAvLyBIQiBFeHRlbnNpb25cbiAgICAgICAgc2Nyb2xsVG9Db2x1bW5JbmRleDogZnVuY3Rpb24oY29sSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW5Nb2RlbCA9IHRoYXQuY29sdW1uQ29udHJvbGxlci5nZXRNb2RlbCgpO1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IGNvbHVtbk1vZGVsLmdldE9mZnNldEZvckNvbHVtbkluZGV4KGNvbEluZGV4KTtcbiAgICAgICAgICAgIHZhciB0b3RhbFdpZHRoID0gY29sdW1uTW9kZWwuZ2V0Qm9keUNvbnRhaW5lcldpZHRoKCk7XG4gICAgICAgICAgICB2YXIgdmlld3BvcnQgPSB0aGF0LmdyaWRQYW5lbC5lQm9keVZpZXdwb3J0O1xuICAgICAgICAgICAgaWYgKG9mZnNldCArIHZpZXdwb3J0Lm9mZnNldFdpZHRoID4gdG90YWxXaWR0aCkge1xuICAgICAgICAgICAgICAgIG9mZnNldCA9IGNvbHVtbk1vZGVsLmdldEJvZHlDb250YWluZXJXaWR0aCgpIC0gdmlld3BvcnQub2Zmc2V0V2lkdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2aWV3cG9ydC5zY3JvbGxMZWZ0ID0gb2Zmc2V0O1xuICAgICAgICB9LFxuICAgICAgICAvLyBIQiBFeHRlbnNpb25cbiAgICAgICAgZ2V0Qm9keVNjcm9sbExlZnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ3JpZFBhbmVsLmVCb2R5Vmlld3BvcnQuc2Nyb2xsTGVmdDtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gSEIgRXh0ZW5zaW9uXG4gICAgICAgIGdldE9mZnNldEZvckNvbHVtbkluZGV4OiBmdW5jdGlvbihjb2xJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuY29sdW1uQ29udHJvbGxlci5nZXRNb2RlbCgpLmdldE9mZnNldEZvckNvbHVtbkluZGV4KGNvbEluZGV4KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gSEIgRXh0ZW5zaW9uXG4gICAgICAgIG9wZW5DbG9zZUdyb3VwQnlOYW1lOiBmdW5jdGlvbihuYW1lLCBvcGVuKSB7XG4gICAgICAgICAgICB0aGF0LmNvbHVtbkNvbnRyb2xsZXIub3BlbkNsb3NlR3JvdXBCeU5hbWUobmFtZSwgb3Blbik7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIEhCIEV4dGVuc2lvblxuICAgICAgICByZWdpc3Rlckdyb3VwTGlzdGVuZXI6IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgICAgICAgICB0aGF0LmNvbHVtbkNvbnRyb2xsZXIucmVnaXN0ZXJHcm91cExpc3RlbmVyKGxpc3RlbmVyKTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gSEIgRXh0ZW5zaW9uXG4gICAgICAgIG9wZW5DbG9zZUFsbENvbHVtbkdyb3VwczogZnVuY3Rpb24ob3Blbikge1xuICAgICAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLm9wZW5DbG9zZUFsbENvbHVtbkdyb3VwcyhvcGVuKTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gSEIgRXh0ZW5zaW9uXG4gICAgICAgIGVkaXRDZWxsQXRSb3dDb2x1bW46IGZ1bmN0aW9uKHJvd0luZGV4LCBjb2x1bW5JbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucm93UmVuZGVyZXIuZWRpdENlbGxBdFJvd0NvbHVtbihyb3dJbmRleCwgY29sdW1uSW5kZXgpO1xuICAgICAgICB9LFxuICAgICAgICByZWZyZXNoQnlSb3dDb2x1bW46IGZ1bmN0aW9uKHJvd0luZGV4LCBjb2x1bW5JbmRleCkge1xuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yZWZyZXNoQnlSb3dDb2x1bW4ocm93SW5kZXgsIGNvbHVtbkluZGV4KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0RGF0YXNvdXJjZTogZnVuY3Rpb24oZGF0YXNvdXJjZSkge1xuICAgICAgICAgICAgdGhhdC5zZXREYXRhc291cmNlKGRhdGFzb3VyY2UpO1xuICAgICAgICB9LFxuICAgICAgICBvbk5ld0RhdGFzb3VyY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5zZXREYXRhc291cmNlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFJvd3M6IGZ1bmN0aW9uKHJvd3MpIHtcbiAgICAgICAgICAgIHRoYXQuc2V0Um93cyhyb3dzKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25OZXdSb3dzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuc2V0Um93cygpO1xuICAgICAgICB9LFxuICAgICAgICBvbk5ld0NvbHM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5vbk5ld0NvbHMoKTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5zZWxlY3RBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcInVuc2VsZWN0QWxsIGRlcHJlY2F0ZWQsIGNhbGwgZGVzZWxlY3RBbGwgaW5zdGVhZFwiKTtcbiAgICAgICAgICAgIHRoaXMuZGVzZWxlY3RBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVmcmVzaFZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yZWZyZXNoVmlldygpO1xuICAgICAgICB9LFxuICAgICAgICBzb2Z0UmVmcmVzaFZpZXc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5zb2Z0UmVmcmVzaFZpZXcoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVmcmVzaEdyb3VwUm93czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LnJvd1JlbmRlcmVyLnJlZnJlc2hHcm91cFJvd3MoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVmcmVzaEhlYWRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBuZWVkIHRvIHJldmlldyB0aGlzIC0gdGhlIHJlZnJlc2hIZWFkZXIgc2hvdWxkIGFsc28gcmVmcmVzaCBhbGwgaWNvbnMgaW4gdGhlIGhlYWRlclxuICAgICAgICAgICAgdGhhdC5oZWFkZXJSZW5kZXJlci5yZWZyZXNoSGVhZGVyKCk7XG4gICAgICAgICAgICB0aGF0LmhlYWRlclJlbmRlcmVyLnVwZGF0ZUZpbHRlckljb25zKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldE1vZGVsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnJvd01vZGVsO1xuICAgICAgICB9LFxuICAgICAgICBvbkdyb3VwRXhwYW5kZWRPckNvbGxhcHNlZDogZnVuY3Rpb24ocmVmcmVzaEZyb21JbmRleCkge1xuICAgICAgICAgICAgdGhhdC51cGRhdGVNb2RlbEFuZFJlZnJlc2goY29uc3RhbnRzLlNURVBfTUFQLCByZWZyZXNoRnJvbUluZGV4KTtcbiAgICAgICAgfSxcbiAgICAgICAgZXhwYW5kQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuaW5NZW1vcnlSb3dDb250cm9sbGVyLmV4cGFuZE9yQ29sbGFwc2VBbGwodHJ1ZSwgbnVsbCk7XG4gICAgICAgICAgICB0aGF0LnVwZGF0ZU1vZGVsQW5kUmVmcmVzaChjb25zdGFudHMuU1RFUF9NQVApO1xuICAgICAgICB9LFxuICAgICAgICBjb2xsYXBzZUFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LmluTWVtb3J5Um93Q29udHJvbGxlci5leHBhbmRPckNvbGxhcHNlQWxsKGZhbHNlLCBudWxsKTtcbiAgICAgICAgICAgIHRoYXQudXBkYXRlTW9kZWxBbmRSZWZyZXNoKGNvbnN0YW50cy5TVEVQX01BUCk7XG4gICAgICAgIH0sXG4gICAgICAgIGFkZFZpcnR1YWxSb3dMaXN0ZW5lcjogZnVuY3Rpb24ocm93SW5kZXgsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGF0LmFkZFZpcnR1YWxSb3dMaXN0ZW5lcihyb3dJbmRleCwgY2FsbGJhY2spO1xuICAgICAgICB9LFxuICAgICAgICByb3dEYXRhQ2hhbmdlZDogZnVuY3Rpb24ocm93cykge1xuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yb3dEYXRhQ2hhbmdlZChyb3dzKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0UXVpY2tGaWx0ZXI6IGZ1bmN0aW9uKG5ld0ZpbHRlcikge1xuICAgICAgICAgICAgdGhhdC5vblF1aWNrRmlsdGVyQ2hhbmdlZChuZXdGaWx0ZXIpXG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdEluZGV4OiBmdW5jdGlvbihpbmRleCwgdHJ5TXVsdGksIHN1cHByZXNzRXZlbnRzKSB7XG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuc2VsZWN0SW5kZXgoaW5kZXgsIHRyeU11bHRpLCBzdXBwcmVzc0V2ZW50cyk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlc2VsZWN0SW5kZXg6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3RJbmRleChpbmRleCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlbGVjdE5vZGU6IGZ1bmN0aW9uKG5vZGUsIHRyeU11bHRpLCBzdXBwcmVzc0V2ZW50cykge1xuICAgICAgICAgICAgdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLnNlbGVjdE5vZGUobm9kZSwgdHJ5TXVsdGksIHN1cHByZXNzRXZlbnRzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVzZWxlY3ROb2RlOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3ROb2RlKG5vZGUpO1xuICAgICAgICB9LFxuICAgICAgICBzZWxlY3RBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLnNlbGVjdEFsbCgpO1xuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yZWZyZXNoVmlldygpO1xuICAgICAgICB9LFxuICAgICAgICBkZXNlbGVjdEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuZGVzZWxlY3RBbGwoKTtcbiAgICAgICAgICAgIHRoYXQucm93UmVuZGVyZXIucmVmcmVzaFZpZXcoKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmVjb21wdXRlQWdncmVnYXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LmluTWVtb3J5Um93Q29udHJvbGxlci5kb0FnZ3JlZ2F0ZSgpO1xuICAgICAgICAgICAgdGhhdC5yb3dSZW5kZXJlci5yZWZyZXNoR3JvdXBSb3dzKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNpemVDb2x1bW5zVG9GaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9udFVzZVNjcm9sbHMoKSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogc2l6ZUNvbHVtbnNUb0ZpdCBkb2VzIG5vdCB3b3JrIHdoZW4gZG9udFVzZVNjcm9sbHM9dHJ1ZScpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBhdmFpbGFibGVXaWR0aCA9IHRoYXQuZ3JpZFBhbmVsLmdldFdpZHRoRm9yU2l6ZUNvbHNUb0ZpdCgpO1xuICAgICAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLnNpemVDb2x1bW5zVG9GaXQoYXZhaWxhYmxlV2lkdGgpO1xuICAgICAgICB9LFxuICAgICAgICBzaG93TG9hZGluZzogZnVuY3Rpb24oc2hvdykge1xuICAgICAgICAgICAgdGhhdC5zaG93TG9hZGluZ1BhbmVsKHNob3cpO1xuICAgICAgICB9LFxuICAgICAgICBpc05vZGVTZWxlY3RlZDogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5pc05vZGVTZWxlY3RlZChub2RlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U2VsZWN0ZWROb2RlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLmdldFNlbGVjdGVkTm9kZXMoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QmVzdENvc3ROb2RlU2VsZWN0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnNlbGVjdGlvbkNvbnRyb2xsZXIuZ2V0QmVzdENvc3ROb2RlU2VsZWN0aW9uKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVuc3VyZUNvbEluZGV4VmlzaWJsZTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHRoYXQuZ3JpZFBhbmVsLmVuc3VyZUNvbEluZGV4VmlzaWJsZShpbmRleCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVuc3VyZUluZGV4VmlzaWJsZTogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICAgICAgIHRoYXQuZ3JpZFBhbmVsLmVuc3VyZUluZGV4VmlzaWJsZShpbmRleCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVuc3VyZU5vZGVWaXNpYmxlOiBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgICAgICAgICB0aGF0LmVuc3VyZU5vZGVWaXNpYmxlKGNvbXBhcmF0b3IpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JFYWNoSW5NZW1vcnk6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGF0LnJvd01vZGVsLmZvckVhY2hJbk1lbW9yeShjYWxsYmFjayk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEZpbHRlckFwaUZvckNvbERlZjogZnVuY3Rpb24oY29sRGVmKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ2FnLWdyaWQgQVBJIG1ldGhvZCBnZXRGaWx0ZXJBcGlGb3JDb2xEZWYgZGVwcmVjYXRlZCwgdXNlIGdldEZpbHRlckFwaSBpbnN0ZWFkJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRGaWx0ZXJBcGkoY29sRGVmKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RmlsdGVyQXBpOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSB0aGF0LmNvbHVtbk1vZGVsLmdldENvbHVtbihrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZmlsdGVyTWFuYWdlci5nZXRGaWx0ZXJBcGkoY29sdW1uKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Q29sdW1uRGVmOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBjb2x1bW4gPSB0aGF0LmNvbHVtbk1vZGVsLmdldENvbHVtbihrZXkpO1xuICAgICAgICAgICAgaWYgKGNvbHVtbikge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb2x1bW4uY29sRGVmO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25GaWx0ZXJDaGFuZ2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQub25GaWx0ZXJDaGFuZ2VkKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFNvcnRNb2RlbDogZnVuY3Rpb24oc29ydE1vZGVsKSB7XG4gICAgICAgICAgICB0aGF0LnNldFNvcnRNb2RlbChzb3J0TW9kZWwpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRTb3J0TW9kZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ2V0U29ydE1vZGVsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEZpbHRlck1vZGVsOiBmdW5jdGlvbihtb2RlbCkge1xuICAgICAgICAgICAgdGhhdC5maWx0ZXJNYW5hZ2VyLnNldEZpbHRlck1vZGVsKG1vZGVsKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RmlsdGVyTW9kZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQuZ2V0RmlsdGVyTW9kZWwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Rm9jdXNlZENlbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucm93UmVuZGVyZXIuZ2V0Rm9jdXNlZENlbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0Rm9jdXNlZENlbGw6IGZ1bmN0aW9uKHJvd0luZGV4LCBjb2xJbmRleCkge1xuICAgICAgICAgICAgdGhhdC5zZXRGb2N1c2VkQ2VsbChyb3dJbmRleCwgY29sSW5kZXgpO1xuICAgICAgICB9LFxuICAgICAgICBzaG93VG9vbFBhbmVsOiBmdW5jdGlvbihzaG93KSB7XG4gICAgICAgICAgICB0aGF0LnNob3dUb29sUGFuZWwoc2hvdyk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzVG9vbFBhbmVsU2hvd2luZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5pc1Rvb2xQYW5lbFNob3dpbmcoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGlkZUNvbHVtbjogZnVuY3Rpb24oY29sSWQsIGhpZGUpIHtcbiAgICAgICAgICAgIHRoYXQuY29sdW1uQ29udHJvbGxlci5oaWRlQ29sdW1ucyhbY29sSWRdLCBoaWRlKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGlkZUNvbHVtbnM6IGZ1bmN0aW9uKGNvbElkcywgaGlkZSkge1xuICAgICAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLmhpZGVDb2x1bW5zKGNvbElkcywgaGlkZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuZ3JpZE9wdGlvbnMuYXBpID0gYXBpO1xufTtcblxuR3JpZC5wcm90b3R5cGUuc2V0Rm9jdXNlZENlbGwgPSBmdW5jdGlvbihyb3dJbmRleCwgY29sSW5kZXgpIHtcbiAgICB0aGlzLmdyaWRQYW5lbC5lbnN1cmVJbmRleFZpc2libGUocm93SW5kZXgpO1xuICAgIHRoaXMuZ3JpZFBhbmVsLmVuc3VyZUNvbEluZGV4VmlzaWJsZShjb2xJbmRleCk7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnJvd1JlbmRlcmVyLnNldEZvY3VzZWRDZWxsKHJvd0luZGV4LCBjb2xJbmRleCk7XG4gICAgfSwgMTApO1xufTtcblxuR3JpZC5wcm90b3R5cGUuZ2V0U29ydE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFsbENvbHVtbnMgPSB0aGlzLmNvbHVtbk1vZGVsLmdldEFsbENvbHVtbnMoKTtcbiAgICB2YXIgY29sdW1uc1dpdGhTb3J0aW5nID0gW107XG4gICAgdmFyIGk7XG4gICAgZm9yIChpID0gMDsgaTxhbGxDb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhbGxDb2x1bW5zW2ldLnNvcnQpIHtcbiAgICAgICAgICAgIGNvbHVtbnNXaXRoU29ydGluZy5wdXNoKGFsbENvbHVtbnNbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNvbHVtbnNXaXRoU29ydGluZy5zb3J0KCBmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgcmV0dXJuIGEuc29ydGVkQXQgLSBiLnNvcnRlZEF0O1xuICAgIH0pO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAoaSA9IDA7IGk8Y29sdW1uc1dpdGhTb3J0aW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciByZXN1bHRFbnRyeSA9IHtcbiAgICAgICAgICAgIGZpZWxkOiBjb2x1bW5zV2l0aFNvcnRpbmdbaV0uY29sRGVmLmZpZWxkLFxuICAgICAgICAgICAgc29ydDogY29sdW1uc1dpdGhTb3J0aW5nW2ldLnNvcnRcbiAgICAgICAgfTtcbiAgICAgICAgcmVzdWx0LnB1c2gocmVzdWx0RW50cnkpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5HcmlkLnByb3RvdHlwZS5zZXRTb3J0TW9kZWwgPSBmdW5jdGlvbihzb3J0TW9kZWwpIHtcbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU29ydGluZygpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogWW91IGFyZSBzZXR0aW5nIHRoZSBzb3J0IG1vZGVsIG9uIGEgZ3JpZCB0aGF0IGRvZXMgbm90IGhhdmUgc29ydGluZyBlbmFibGVkJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gZmlyc3QgdXAsIGNsZWFyIGFueSBwcmV2aW91cyBzb3J0XG4gICAgdmFyIHNvcnRNb2RlbFByb3ZpZGVkID0gc29ydE1vZGVsIT09bnVsbCAmJiBzb3J0TW9kZWwhPT11bmRlZmluZWQgJiYgc29ydE1vZGVsLmxlbmd0aD4wO1xuICAgIHZhciBhbGxDb2x1bW5zID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXRBbGxDb2x1bW5zKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGk8YWxsQ29sdW1ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY29sdW1uID0gYWxsQ29sdW1uc1tpXTtcblxuICAgICAgICB2YXIgc29ydEZvckNvbCA9IG51bGw7XG4gICAgICAgIHZhciBzb3J0ZWRBdCA9IC0xO1xuICAgICAgICBpZiAoc29ydE1vZGVsUHJvdmlkZWQgJiYgIWNvbHVtbi5jb2xEZWYuc3VwcHJlc3NTb3J0aW5nKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgajxzb3J0TW9kZWwubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc29ydE1vZGVsRW50cnkgPSBzb3J0TW9kZWxbal07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3J0TW9kZWxFbnRyeS5maWVsZCA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgJiYgdHlwZW9mIGNvbHVtbi5jb2xEZWYuZmllbGQgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICAgICAgICAgICYmIHNvcnRNb2RlbEVudHJ5LmZpZWxkID09PSBjb2x1bW4uY29sRGVmLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvcnRGb3JDb2wgPSBzb3J0TW9kZWxFbnRyeS5zb3J0O1xuICAgICAgICAgICAgICAgICAgICBzb3J0ZWRBdCA9IGo7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNvcnRGb3JDb2wpIHtcbiAgICAgICAgICAgIGNvbHVtbi5zb3J0ID0gc29ydEZvckNvbDtcbiAgICAgICAgICAgIGNvbHVtbi5zb3J0ZWRBdCA9IHNvcnRlZEF0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29sdW1uLnNvcnQgPSBudWxsO1xuICAgICAgICAgICAgY29sdW1uLnNvcnRlZEF0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMub25Tb3J0aW5nQ2hhbmdlZCgpO1xufTtcblxuR3JpZC5wcm90b3R5cGUub25Tb3J0aW5nQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGVhZGVyUmVuZGVyZXIudXBkYXRlU29ydEljb25zKCk7XG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcoKSkge1xuICAgICAgICAvLyBpZiBkb2luZyBzZXJ2ZXIgc2lkZSBzb3J0aW5nLCBjaGFuZ2luZyB0aGUgc29ydCBoYXMgdGhlIGltcGFjdFxuICAgICAgICAvLyBvZiByZXNldHRpbmcgdGhlIGRhdGFzb3VyY2VcbiAgICAgICAgdGhpcy5zZXREYXRhc291cmNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgZG9pbmcgaW4gbWVtb3J5IHNvcnRpbmcsIHdlIGp1c3QgdXBkYXRlIHRoZSBpbiBtZW1vcnkgZGF0YVxuICAgICAgICB0aGlzLnVwZGF0ZU1vZGVsQW5kUmVmcmVzaChjb25zdGFudHMuU1RFUF9TT1JUKTtcbiAgICB9XG59O1xuXG5HcmlkLnByb3RvdHlwZS5hZGRWaXJ0dWFsUm93TGlzdGVuZXIgPSBmdW5jdGlvbihyb3dJbmRleCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMudmlydHVhbFJvd0NhbGxiYWNrc1tyb3dJbmRleF0pIHtcbiAgICAgICAgdGhpcy52aXJ0dWFsUm93Q2FsbGJhY2tzW3Jvd0luZGV4XSA9IFtdO1xuICAgIH1cbiAgICB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdLnB1c2goY2FsbGJhY2spO1xufTtcblxuR3JpZC5wcm90b3R5cGUub25WaXJ0dWFsUm93U2VsZWN0ZWQgPSBmdW5jdGlvbihyb3dJbmRleCwgc2VsZWN0ZWQpIHtcbiAgICAvLyBpbmZvcm0gdGhlIGNhbGxiYWNrcyBvZiB0aGUgZXZlbnRcbiAgICBpZiAodGhpcy52aXJ0dWFsUm93Q2FsbGJhY2tzW3Jvd0luZGV4XSkge1xuICAgICAgICB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sucm93UmVtb3ZlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJvd1NlbGVjdGVkKHNlbGVjdGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuR3JpZC5wcm90b3R5cGUub25WaXJ0dWFsUm93UmVtb3ZlZCA9IGZ1bmN0aW9uKHJvd0luZGV4KSB7XG4gICAgLy8gaW5mb3JtIHRoZSBjYWxsYmFja3Mgb2YgdGhlIGV2ZW50XG4gICAgaWYgKHRoaXMudmlydHVhbFJvd0NhbGxiYWNrc1tyb3dJbmRleF0pIHtcbiAgICAgICAgdGhpcy52aXJ0dWFsUm93Q2FsbGJhY2tzW3Jvd0luZGV4XS5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrLnJvd1JlbW92ZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjay5yb3dSZW1vdmVkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyByZW1vdmUgdGhlIGNhbGxiYWNrc1xuICAgIGRlbGV0ZSB0aGlzLnZpcnR1YWxSb3dDYWxsYmFja3Nbcm93SW5kZXhdO1xufTtcblxuR3JpZC5wcm90b3R5cGUub25OZXdDb2xzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXR1cENvbHVtbnMoKTtcbiAgICB0aGlzLnVwZGF0ZU1vZGVsQW5kUmVmcmVzaChjb25zdGFudHMuU1RFUF9FVkVSWVRISU5HKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLnVwZGF0ZUJvZHlDb250YWluZXJXaWR0aEFmdGVyQ29sUmVzaXplID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yb3dSZW5kZXJlci5zZXRNYWluUm93V2lkdGhzKCk7XG4gICAgdGhpcy5ncmlkUGFuZWwuc2V0Qm9keUNvbnRhaW5lcldpZHRoKCk7XG59O1xuXG5HcmlkLnByb3RvdHlwZS51cGRhdGVQaW5uZWRDb2xDb250YWluZXJXaWR0aEFmdGVyQ29sUmVzaXplID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5ncmlkUGFuZWwuc2V0UGlubmVkQ29sQ29udGFpbmVyV2lkdGgoKTtcbn07XG5cbkdyaWQucHJvdG90eXBlLmRvTGF5b3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gbmVlZCB0byBkbyBsYXlvdXQgZmlyc3QsIGFzIGRyYXdWaXJ0dWFsUm93cyBhbmQgc2V0UGlubmVkQ29sSGVpZ2h0XG4gICAgLy8gbmVlZCB0byBrbm93IHRoZSByZXN1bHQgb2YgdGhlIHJlc2l6aW5nIG9mIHRoZSBwYW5lbHMuXG4gICAgdGhpcy5lUm9vdFBhbmVsLmRvTGF5b3V0KCk7XG4gICAgLy8gYm90aCBvZiB0aGUgdHdvIGJlbG93IHNob3VsZCBiZSBkb25lIGluIGdyaWRQYW5lbCwgdGhlIGdyaWRQYW5lbCBzaG91bGQgcmVnaXN0ZXIgJ3Jlc2l6ZScgdG8gdGhlIHBhbmVsXG4gICAgdGhpcy5yb3dSZW5kZXJlci5kcmF3VmlydHVhbFJvd3MoKTtcbiAgICB0aGlzLmdyaWRQYW5lbC5zZXRQaW5uZWRDb2xIZWlnaHQoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JpZDtcbiIsInZhciBERUZBVUxUX1JPV19IRUlHSFQgPSAzMDtcblxudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5mdW5jdGlvbiBHcmlkT3B0aW9uc1dyYXBwZXIoZ3JpZE9wdGlvbnMpIHtcbiAgICB0aGlzLmdyaWRPcHRpb25zID0gZ3JpZE9wdGlvbnM7XG4gICAgdGhpcy5zZXR1cERlZmF1bHRzKCk7XG59XG5cbmZ1bmN0aW9uIGlzVHJ1ZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gJ3RydWUnO1xufVxuXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzUm93U2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd1NlbGVjdGlvbiA9PT0gXCJzaW5nbGVcIiB8fCB0aGlzLmdyaWRPcHRpb25zLnJvd1NlbGVjdGlvbiA9PT0gXCJtdWx0aXBsZVwiOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1Jvd0Rlc2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5yb3dEZXNlbGVjdGlvbik7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzUm93U2VsZWN0aW9uTXVsdGkgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMucm93U2VsZWN0aW9uID09PSAnbXVsdGlwbGUnOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRDb250ZXh0ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNvbnRleHQ7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzVmlydHVhbFBhZ2luZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMudmlydHVhbFBhZ2luZyk7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzU2hvd1Rvb2xQYW5lbCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuc2hvd1Rvb2xQYW5lbCk7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzUm93c0FscmVhZHlHcm91cGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5yb3dzQWxyZWFkeUdyb3VwZWQpOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0dyb3VwU2VsZWN0c0NoaWxkcmVuID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5ncm91cFNlbGVjdHNDaGlsZHJlbik7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzR3JvdXBJbmNsdWRlRm9vdGVyID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5ncm91cEluY2x1ZGVGb290ZXIpOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1N1cHByZXNzUm93Q2xpY2tTZWxlY3Rpb24gPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLnN1cHByZXNzUm93Q2xpY2tTZWxlY3Rpb24pOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1N1cHByZXNzQ2VsbFNlbGVjdGlvbiA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuc3VwcHJlc3NDZWxsU2VsZWN0aW9uKTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNTdXBwcmVzc1VuU29ydCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuc3VwcHJlc3NVblNvcnQpOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc1N1cHByZXNzTXVsdGlTb3J0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5zdXBwcmVzc011bHRpU29ydCk7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzR3JvdXBTdXBwcmVzc0F1dG9Db2x1bW4gPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmdyb3VwU3VwcHJlc3NBdXRvQ29sdW1uKTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNHcm91cEhlYWRlcnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmdyb3VwSGVhZGVycyk7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRG9udFVzZVNjcm9sbHMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmRvbnRVc2VTY3JvbGxzKTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNTdXBwcmVzc0Rlc2NTb3J0ID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5zdXBwcmVzc0Rlc2NTb3J0KTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0Um93U3R5bGUgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMucm93U3R5bGU7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzUGlubmVkQ29sQXV0b0V4cGFuZFdpZHRoID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5pc1Bpbm5lZENvbEF1dG9FeHBhbmRXaWR0aCk7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFJvd0NsYXNzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd0NsYXNzOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRIZWFkZXJDZWxsUmVuZGVyZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuaGVhZGVyQ2VsbFJlbmRlcmVyOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRBcGkgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuYXBpOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0VuYWJsZUNvbFJlc2l6ZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5lbmFibGVDb2xSZXNpemU7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldEdyb3VwRGVmYXVsdEV4cGFuZGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmdyb3VwRGVmYXVsdEV4cGFuZGVkOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRHcm91cEtleXMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBLZXlzOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRHcm91cEFnZ0Z1bmN0aW9uID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmdyb3VwQWdnRnVuY3Rpb247IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldEdyb3VwQWdnRmllbGRzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmdyb3VwQWdnRmllbGRzOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRBbGxSb3dzID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd0RhdGE7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldERPTVJvd3NDaGFuZ2VkSGFuZGxlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5ET01Sb3dzQ2hhbmdlZEhhbmRsZXI7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzR3JvdXBVc2VFbnRpcmVSb3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmdyb3VwVXNlRW50aXJlUm93KTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0R3JvdXBDb2x1bW5EZWYgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuZ3JvdXBDb2x1bW5EZWY7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzQW5ndWxhckNvbXBpbGVSb3dzID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5hbmd1bGFyQ29tcGlsZVJvd3MpOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0FuZ3VsYXJDb21waWxlRmlsdGVycyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuYW5ndWxhckNvbXBpbGVGaWx0ZXJzKTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNBbmd1bGFyQ29tcGlsZUhlYWRlcnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmFuZ3VsYXJDb21waWxlSGVhZGVycyk7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENvbHVtbkRlZnMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuY29sdW1uRGVmczsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0Um93SGVpZ2h0ID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd0hlaWdodDsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0TW9kZWxVcGRhdGVkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLm1vZGVsVXBkYXRlZDsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0Q2VsbENsaWNrZWQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZ3JpZE9wdGlvbnMuY2VsbENsaWNrZWQ7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENlbGxEb3VibGVDbGlja2VkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNlbGxEb3VibGVDbGlja2VkOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRDZWxsVmFsdWVDaGFuZ2VkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNlbGxWYWx1ZUNoYW5nZWQ7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldENlbGxGb2N1c2VkID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmNlbGxGb2N1c2VkOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRSb3dTZWxlY3RlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yb3dTZWxlY3RlZDsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0U2VsZWN0aW9uQ2hhbmdlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5zZWxlY3Rpb25DaGFuZ2VkOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRWaXJ0dWFsUm93UmVtb3ZlZCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy52aXJ0dWFsUm93UmVtb3ZlZDsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0RGF0YXNvdXJjZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5kYXRhc291cmNlOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRSZWFkeSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5yZWFkeTsgfTtcbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0Um93QnVmZmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnJvd0J1ZmZlcjsgfTtcblxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRHcm91cFJvd0lubmVyUmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9ucy5ncm91cElubmVyUmVuZGVyZXIpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdhZy1ncmlkOiBhcyBvZiB2MS4xMC4wICgyMXN0IEp1biAyMDE1KSBncm91cElubmVyUmVuZGVyZXIgaXMgbndvIGNhbGxlZCBncm91cFJvd0lubmVyUmVuZGVyZXIuIFBsZWFzZSBjaGFuZ2UgeW91IGNvZGUgYXMgZ3JvdXBJbm5lclJlbmRlcmVyIGlzIGRlcHJlY2F0ZWQuJyk7XG4gICAgICAgIHJldHVybiB0aGlzLmdyaWRPcHRpb25zLmdyb3VwSW5uZXJSZW5kZXJlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5ncm91cFJvd0lubmVyUmVuZGVyZXI7XG4gICAgfVxufTtcblxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5nZXRDb2xXaWR0aCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9ucy5jb2xXaWR0aCAhPT0gJ251bWJlcicgfHwgIHRoaXMuZ3JpZE9wdGlvbnMuY29sV2lkdGggPCBjb25zdGFudHMuTUlOX0NPTF9XSURUSCkge1xuICAgICAgICByZXR1cm4gMjAwO1xuICAgIH0gZWxzZSAge1xuICAgICAgICByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5jb2xXaWR0aDtcbiAgICB9XG59O1xuXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRW5hYmxlU29ydGluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZW5hYmxlU29ydGluZykgfHwgaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZW5hYmxlU2VydmVyU2lkZVNvcnRpbmcpOyB9O1xuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5pc0VuYWJsZVNlcnZlclNpZGVTb3J0aW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBpc1RydWUodGhpcy5ncmlkT3B0aW9ucy5lbmFibGVTZXJ2ZXJTaWRlU29ydGluZyk7IH07XG5cbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuaXNFbmFibGVGaWx0ZXIgPSBmdW5jdGlvbigpIHsgcmV0dXJuIGlzVHJ1ZSh0aGlzLmdyaWRPcHRpb25zLmVuYWJsZUZpbHRlcikgfHwgaXNUcnVlKHRoaXMuZ3JpZE9wdGlvbnMuZW5hYmxlU2VydmVyU2lkZUZpbHRlcik7IH07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmlzRW5hYmxlU2VydmVyU2lkZUZpbHRlciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5lbmFibGVTZXJ2ZXJTaWRlRmlsdGVyOyB9O1xuXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLnNldFNlbGVjdGVkUm93cyA9IGZ1bmN0aW9uKG5ld1NlbGVjdGVkUm93cykge1xuICAgIHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnNlbGVjdGVkUm93cyA9IG5ld1NlbGVjdGVkUm93cztcbn07XG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLnNldFNlbGVjdGVkTm9kZXNCeUlkID0gZnVuY3Rpb24obmV3U2VsZWN0ZWROb2Rlcykge1xuICAgIHJldHVybiB0aGlzLmdyaWRPcHRpb25zLnNlbGVjdGVkTm9kZXNCeUlkID0gbmV3U2VsZWN0ZWROb2Rlcztcbn07XG5cbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0SWNvbnMgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5pY29ucztcbn07XG5cbkdyaWRPcHRpb25zV3JhcHBlci5wcm90b3R5cGUuZ2V0SGVhZGVySGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLmdyaWRPcHRpb25zLmhlYWRlckhlaWdodCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gaWYgaGVhZGVyIGhlaWdodCBwcm92aWRlZCwgdXNlZCBpdFxuICAgICAgICByZXR1cm4gdGhpcy5ncmlkT3B0aW9ucy5oZWFkZXJIZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHJldHVybiAyNSBpZiBubyBncm91cGluZywgNTAgaWYgZ3JvdXBpbmdcbiAgICAgICAgaWYgKHRoaXMuaXNHcm91cEhlYWRlcnMoKSkge1xuICAgICAgICAgICAgcmV0dXJuIDUwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDI1O1xuICAgICAgICB9XG4gICAgfVxufTtcblxuR3JpZE9wdGlvbnNXcmFwcGVyLnByb3RvdHlwZS5zZXR1cERlZmF1bHRzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zLnJvd0hlaWdodCkge1xuICAgICAgICB0aGlzLmdyaWRPcHRpb25zLnJvd0hlaWdodCA9IERFRkFVTFRfUk9XX0hFSUdIVDtcbiAgICB9XG59O1xuXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldFBpbm5lZENvbENvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgbm90IHVzaW5nIHNjcm9sbHMsIHRoZW4gcGlubmVkIGNvbHVtbnMgZG9lc24ndCBtYWtlXG4gICAgLy8gc2Vuc2UsIHNvIGFsd2F5cyByZXR1cm4gMFxuICAgIGlmICh0aGlzLmlzRG9udFVzZVNjcm9sbHMoKSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnMucGlubmVkQ29sdW1uQ291bnQpIHtcbiAgICAgICAgLy9pbiBjYXNlIHVzZXIgcHV0cyBpbiBhIHN0cmluZywgY2FzdCB0byBudW1iZXJcbiAgICAgICAgcmV0dXJuIE51bWJlcih0aGlzLmdyaWRPcHRpb25zLnBpbm5lZENvbHVtbkNvdW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59O1xuXG5HcmlkT3B0aW9uc1dyYXBwZXIucHJvdG90eXBlLmdldExvY2FsZVRleHRGdW5jID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJldHVybiBmdW5jdGlvbiAoa2V5LCBkZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgdmFyIGxvY2FsZVRleHQgPSB0aGF0LmdyaWRPcHRpb25zLmxvY2FsZVRleHQ7XG4gICAgICAgIGlmIChsb2NhbGVUZXh0ICYmIGxvY2FsZVRleHRba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2FsZVRleHRba2V5XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcmlkT3B0aW9uc1dyYXBwZXI7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdj48ZGl2IGNsYXNzPWFnLWhlYWRlcj48ZGl2IGNsYXNzPWFnLXBpbm5lZC1oZWFkZXI+PC9kaXY+PGRpdiBjbGFzcz1hZy1oZWFkZXItdmlld3BvcnQ+PGRpdiBjbGFzcz1hZy1oZWFkZXItY29udGFpbmVyPjwvZGl2PjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9YWctYm9keT48ZGl2IGNsYXNzPWFnLXBpbm5lZC1jb2xzLXZpZXdwb3J0PjxkaXYgY2xhc3M9YWctcGlubmVkLWNvbHMtY29udGFpbmVyPjwvZGl2PjwvZGl2PjxkaXYgY2xhc3M9YWctYm9keS12aWV3cG9ydC13cmFwcGVyPjxkaXYgY2xhc3M9YWctYm9keS12aWV3cG9ydD48ZGl2IGNsYXNzPWFnLWJvZHktY29udGFpbmVyPjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PjwvZGl2PlwiO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjxkaXY+PGRpdiBjbGFzcz1hZy1oZWFkZXItY29udGFpbmVyPjwvZGl2PjxkaXYgY2xhc3M9YWctYm9keS1jb250YWluZXI+PC9kaXY+PC9kaXY+XCI7XG4iLCJ2YXIgZ3JpZEh0bWwgPSByZXF1aXJlKCcuL2dyaWQuaHRtbCcpO1xudmFyIGdyaWROb1Njcm9sbHNIdG1sID0gcmVxdWlyZSgnLi9ncmlkTm9TY3JvbGxzLmh0bWwnKTtcbnZhciBsb2FkaW5nSHRtbCA9IHJlcXVpcmUoJy4vbG9hZGluZy5odG1sJyk7XG52YXIgQm9yZGVyTGF5b3V0ID0gcmVxdWlyZSgnLi4vbGF5b3V0L2JvcmRlckxheW91dCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gR3JpZFBhbmVsKGdyaWRPcHRpb25zV3JhcHBlcikge1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xuICAgIC8vIG1ha2VzIGNvZGUgYmVsb3cgbW9yZSByZWFkYWJsZSBpZiB3ZSBwdWxsICdmb3JQcmludCcgb3V0XG4gICAgdGhpcy5mb3JQcmludCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9udFVzZVNjcm9sbHMoKTtcbiAgICB0aGlzLnNldHVwQ29tcG9uZW50cygpO1xuICAgIHRoaXMuc2Nyb2xsV2lkdGggPSB1dGlscy5nZXRTY3JvbGxiYXJXaWR0aCgpO1xufVxuXG5HcmlkUGFuZWwucHJvdG90eXBlLnNldHVwQ29tcG9uZW50cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYgKHRoaXMuZm9yUHJpbnQpIHtcbiAgICAgICAgdGhpcy5lUm9vdCA9IHV0aWxzLmxvYWRUZW1wbGF0ZShncmlkTm9TY3JvbGxzSHRtbCk7XG4gICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKHRoaXMuZVJvb3QsICdhZy1yb290IGFnLW5vLXNjcm9sbHMnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVSb290ID0gdXRpbHMubG9hZFRlbXBsYXRlKGdyaWRIdG1sKTtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3ModGhpcy5lUm9vdCwgJ2FnLXJvb3QgYWctc2Nyb2xscycpO1xuICAgIH1cblxuICAgIHRoaXMuZmluZEVsZW1lbnRzKCk7XG5cbiAgICB0aGlzLmxheW91dCA9IG5ldyBCb3JkZXJMYXlvdXQoe1xuICAgICAgICBvdmVybGF5OiB1dGlscy5sb2FkVGVtcGxhdGUobG9hZGluZ0h0bWwpLFxuICAgICAgICBjZW50ZXI6IHRoaXMuZVJvb3QsXG4gICAgICAgIGRvbnRGaWxsOiB0aGlzLmZvclByaW50LFxuICAgICAgICBuYW1lOiAnZUdyaWRQYW5lbCdcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkU2Nyb2xsTGlzdGVuZXIoKTtcbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuZW5zdXJlSW5kZXhWaXNpYmxlID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB2YXIgbGFzdFJvdyA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvd0NvdW50KCk7XG4gICAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicgfHwgaW5kZXggPCAwIHx8IGluZGV4ID49IGxhc3RSb3cpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdpbnZhbGlkIHJvdyBpbmRleCBmb3IgZW5zdXJlSW5kZXhWaXNpYmxlOiAnICsgaW5kZXgpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHJvd0hlaWdodCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0hlaWdodCgpO1xuICAgIHZhciByb3dUb3BQaXhlbCA9IHJvd0hlaWdodCAqIGluZGV4O1xuICAgIHZhciByb3dCb3R0b21QaXhlbCA9IHJvd1RvcFBpeGVsICsgcm93SGVpZ2h0O1xuXG4gICAgdmFyIHZpZXdwb3J0VG9wUGl4ZWwgPSB0aGlzLmVCb2R5Vmlld3BvcnQuc2Nyb2xsVG9wO1xuICAgIHZhciB2aWV3cG9ydEhlaWdodCA9IHRoaXMuZUJvZHlWaWV3cG9ydC5vZmZzZXRIZWlnaHQ7XG4gICAgdmFyIHNjcm9sbFNob3dpbmcgPSB0aGlzLmVCb2R5Vmlld3BvcnQuY2xpZW50V2lkdGggPCB0aGlzLmVCb2R5Vmlld3BvcnQuc2Nyb2xsV2lkdGg7XG4gICAgaWYgKHNjcm9sbFNob3dpbmcpIHtcbiAgICAgICAgdmlld3BvcnRIZWlnaHQgLT0gdGhpcy5zY3JvbGxXaWR0aDtcbiAgICB9XG4gICAgdmFyIHZpZXdwb3J0Qm90dG9tUGl4ZWwgPSB2aWV3cG9ydFRvcFBpeGVsICsgdmlld3BvcnRIZWlnaHQ7XG5cbiAgICB2YXIgdmlld3BvcnRTY3JvbGxlZFBhc3RSb3cgPSB2aWV3cG9ydFRvcFBpeGVsID4gcm93VG9wUGl4ZWw7XG4gICAgdmFyIHZpZXdwb3J0U2Nyb2xsZWRCZWZvcmVSb3cgPSB2aWV3cG9ydEJvdHRvbVBpeGVsIDwgcm93Qm90dG9tUGl4ZWw7XG5cbiAgICBpZiAodmlld3BvcnRTY3JvbGxlZFBhc3RSb3cpIHtcbiAgICAgICAgLy8gaWYgcm93IGlzIGJlZm9yZSwgc2Nyb2xsIHVwIHdpdGggcm93IGF0IHRvcFxuICAgICAgICB0aGlzLmVCb2R5Vmlld3BvcnQuc2Nyb2xsVG9wID0gcm93VG9wUGl4ZWw7XG4gICAgfSBlbHNlIGlmICh2aWV3cG9ydFNjcm9sbGVkQmVmb3JlUm93KSB7XG4gICAgICAgIC8vIGlmIHJvdyBpcyBiZWxvdywgc2Nyb2xsIGRvd24gd2l0aCByb3cgYXQgYm90dG9tXG4gICAgICAgIHZhciBuZXdTY3JvbGxQb3NpdGlvbiA9IHJvd0JvdHRvbVBpeGVsIC0gdmlld3BvcnRIZWlnaHQ7XG4gICAgICAgIHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxUb3AgPSBuZXdTY3JvbGxQb3NpdGlvbjtcbiAgICB9XG4gICAgLy8gb3RoZXJ3aXNlLCByb3cgaXMgYWxyZWFkeSBpbiB2aWV3LCBzbyBkbyBub3RoaW5nXG59O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLmVuc3VyZUNvbEluZGV4VmlzaWJsZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdjb2wgaW5kZXggbXVzdCBiZSBhIG51bWJlcjogJyArIGluZGV4KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjb2x1bW5zID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXREaXNwbGF5ZWRDb2x1bW5zKCk7XG4gICAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicgfHwgaW5kZXggPCAwIHx8IGluZGV4ID49IGNvbHVtbnMubGVuZ3RoKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignaW52YWxpZCBjb2wgaW5kZXggZm9yIGVuc3VyZUNvbEluZGV4VmlzaWJsZTogJyArIGluZGV4XG4gICAgICAgICAgICArICcsIHNob3VsZCBiZSBiZXR3ZWVuIDAgYW5kICcgKyAoY29sdW1ucy5sZW5ndGggLSAxKSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY29sdW1uID0gY29sdW1uc1tpbmRleF07XG4gICAgdmFyIHBpbm5lZENvbENvdW50ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0UGlubmVkQ29sQ291bnQoKTtcbiAgICBpZiAoaW5kZXggPCBwaW5uZWRDb2xDb3VudCkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ2ludmFsaWQgY29sIGluZGV4IGZvciBlbnN1cmVDb2xJbmRleFZpc2libGU6ICcgKyBpbmRleFxuICAgICAgICAgICAgKyAnLCBzY3JvbGxpbmcgdG8gYSBwaW5uZWQgY29sIG1ha2VzIG5vIHNlbnNlJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzdW0gdXAgYWxsIGNvbCB3aWR0aCB0byB0aGUgbGV0IHRvIGdldCB0aGUgc3RhcnQgcGl4ZWxcbiAgICB2YXIgY29sTGVmdFBpeGVsID0gMDtcbiAgICBmb3IgKHZhciBpID0gcGlubmVkQ29sQ291bnQ7IGk8aW5kZXg7IGkrKykge1xuICAgICAgICBjb2xMZWZ0UGl4ZWwgKz0gY29sdW1uc1tpXS5hY3R1YWxXaWR0aDtcbiAgICB9XG5cbiAgICB2YXIgY29sUmlnaHRQaXhlbCA9IGNvbExlZnRQaXhlbCArIGNvbHVtbi5hY3R1YWxXaWR0aDtcblxuICAgIHZhciB2aWV3cG9ydExlZnRQaXhlbCA9IHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxMZWZ0O1xuICAgIHZhciB2aWV3cG9ydFdpZHRoID0gdGhpcy5lQm9keVZpZXdwb3J0Lm9mZnNldFdpZHRoO1xuXG4gICAgdmFyIHNjcm9sbFNob3dpbmcgPSB0aGlzLmVCb2R5Vmlld3BvcnQuY2xpZW50SGVpZ2h0IDwgdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbEhlaWdodDtcbiAgICBpZiAoc2Nyb2xsU2hvd2luZykge1xuICAgICAgICB2aWV3cG9ydFdpZHRoIC09IHRoaXMuc2Nyb2xsV2lkdGg7XG4gICAgfVxuXG4gICAgdmFyIHZpZXdwb3J0UmlnaHRQaXhlbCA9IHZpZXdwb3J0TGVmdFBpeGVsICsgdmlld3BvcnRXaWR0aDtcblxuICAgIHZhciB2aWV3cG9ydFNjcm9sbGVkUGFzdENvbCA9IHZpZXdwb3J0TGVmdFBpeGVsID4gY29sTGVmdFBpeGVsO1xuICAgIHZhciB2aWV3cG9ydFNjcm9sbGVkQmVmb3JlQ29sID0gdmlld3BvcnRSaWdodFBpeGVsIDwgY29sUmlnaHRQaXhlbDtcblxuICAgIGlmICh2aWV3cG9ydFNjcm9sbGVkUGFzdENvbCkge1xuICAgICAgICAvLyBpZiB2aWV3cG9ydCdzIGxlZnQgc2lkZSBpcyBhZnRlciBjb2wncyBsZWZ0IHNpZGUsIHNjcm9sbCByaWdodCB0byBwdWxsIGNvbCBpbnRvIHZpZXdwb3J0IGF0IGxlZnRcbiAgICAgICAgdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbExlZnQgPSBjb2xMZWZ0UGl4ZWw7XG4gICAgfSBlbHNlIGlmICh2aWV3cG9ydFNjcm9sbGVkQmVmb3JlQ29sKSB7XG4gICAgICAgIC8vIGlmIHZpZXdwb3J0J3MgcmlnaHQgc2lkZSBpcyBiZWZvcmUgY29sJ3MgcmlnaHQgc2lkZSwgc2Nyb2xsIGxlZnQgdG8gcHVsbCBjb2wgaW50byB2aWV3cG9ydCBhdCByaWdodFxuICAgICAgICB2YXIgbmV3U2Nyb2xsUG9zaXRpb24gPSBjb2xSaWdodFBpeGVsIC0gdmlld3BvcnRXaWR0aDtcbiAgICAgICAgdGhpcy5lQm9keVZpZXdwb3J0LnNjcm9sbExlZnQgPSBuZXdTY3JvbGxQb3NpdGlvbjtcbiAgICB9XG4gICAgLy8gb3RoZXJ3aXNlLCBjb2wgaXMgYWxyZWFkeSBpbiB2aWV3LCBzbyBkbyBub3RoaW5nXG59O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLnNob3dMb2FkaW5nID0gZnVuY3Rpb24obG9hZGluZykge1xuICAgIHRoaXMubGF5b3V0LnNldE92ZXJsYXlWaXNpYmxlKGxvYWRpbmcpO1xufTtcblxuR3JpZFBhbmVsLnByb3RvdHlwZS5nZXRXaWR0aEZvclNpemVDb2xzVG9GaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXZhaWxhYmxlV2lkdGggPSB0aGlzLmVCb2R5LmNsaWVudFdpZHRoO1xuICAgIHZhciBzY3JvbGxTaG93aW5nID0gdGhpcy5lQm9keVZpZXdwb3J0LmNsaWVudEhlaWdodCA8IHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxIZWlnaHQ7XG4gICAgaWYgKHNjcm9sbFNob3dpbmcpIHtcbiAgICAgICAgYXZhaWxhYmxlV2lkdGggLT0gdGhpcy5zY3JvbGxXaWR0aDtcbiAgICB9XG4gICAgcmV0dXJuIGF2YWlsYWJsZVdpZHRoO1xufTtcblxuR3JpZFBhbmVsLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oY29sdW1uTW9kZWwsIHJvd1JlbmRlcmVyKSB7XG4gICAgdGhpcy5jb2x1bW5Nb2RlbCA9IGNvbHVtbk1vZGVsO1xuICAgIHRoaXMucm93UmVuZGVyZXIgPSByb3dSZW5kZXJlcjtcbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuc2V0Um93TW9kZWwgPSBmdW5jdGlvbihyb3dNb2RlbCkge1xuICAgIHRoaXMucm93TW9kZWwgPSByb3dNb2RlbDtcbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0Qm9keUNvbnRhaW5lciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5lQm9keUNvbnRhaW5lcjsgfTtcblxuR3JpZFBhbmVsLnByb3RvdHlwZS5nZXRCb2R5Vmlld3BvcnQgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZUJvZHlWaWV3cG9ydDsgfTtcblxuR3JpZFBhbmVsLnByb3RvdHlwZS5nZXRQaW5uZWRDb2xzQ29udGFpbmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmVQaW5uZWRDb2xzQ29udGFpbmVyOyB9O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLmdldEhlYWRlckNvbnRhaW5lciA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5lSGVhZGVyQ29udGFpbmVyOyB9O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLmdldFJvb3QgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuZVJvb3Q7IH07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0UGlubmVkSGVhZGVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmVQaW5uZWRIZWFkZXI7IH07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0SGVhZGVyID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLmVIZWFkZXI7IH07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuZ2V0Um93c1BhcmVudCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5lUGFyZW50T2ZSb3dzOyB9O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLmZpbmRFbGVtZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmZvclByaW50KSB7XG4gICAgICAgIHRoaXMuZUhlYWRlckNvbnRhaW5lciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1oZWFkZXItY29udGFpbmVyXCIpO1xuICAgICAgICB0aGlzLmVCb2R5Q29udGFpbmVyID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLWJvZHktY29udGFpbmVyXCIpO1xuICAgICAgICAvLyBmb3Igbm8tc2Nyb2xscywgYWxsIHJvd3MgbGl2ZSBpbiB0aGUgYm9keSBjb250YWluZXJcbiAgICAgICAgdGhpcy5lUGFyZW50T2ZSb3dzID0gdGhpcy5lQm9keUNvbnRhaW5lcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVCb2R5ID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLWJvZHlcIik7XG4gICAgICAgIHRoaXMuZUJvZHlDb250YWluZXIgPSB0aGlzLmVSb290LnF1ZXJ5U2VsZWN0b3IoXCIuYWctYm9keS1jb250YWluZXJcIik7XG4gICAgICAgIHRoaXMuZUJvZHlWaWV3cG9ydCA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1ib2R5LXZpZXdwb3J0XCIpO1xuICAgICAgICB0aGlzLmVCb2R5Vmlld3BvcnRXcmFwcGVyID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLWJvZHktdmlld3BvcnQtd3JhcHBlclwiKTtcbiAgICAgICAgdGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1waW5uZWQtY29scy1jb250YWluZXJcIik7XG4gICAgICAgIHRoaXMuZVBpbm5lZENvbHNWaWV3cG9ydCA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1waW5uZWQtY29scy12aWV3cG9ydFwiKTtcbiAgICAgICAgdGhpcy5lUGlubmVkSGVhZGVyID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yKFwiLmFnLXBpbm5lZC1oZWFkZXJcIik7XG4gICAgICAgIHRoaXMuZUhlYWRlciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1oZWFkZXJcIik7XG4gICAgICAgIHRoaXMuZUhlYWRlckNvbnRhaW5lciA9IHRoaXMuZVJvb3QucXVlcnlTZWxlY3RvcihcIi5hZy1oZWFkZXItY29udGFpbmVyXCIpO1xuICAgICAgICAvLyBmb3Igc2Nyb2xscywgYWxsIHJvd3MgbGl2ZSBpbiBlQm9keSAoY29udGFpbmluZyBwaW5uZWQgYW5kIG5vcm1hbCBib2R5KVxuICAgICAgICB0aGlzLmVQYXJlbnRPZlJvd3MgPSB0aGlzLmVCb2R5O1xuICAgIH1cbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuc2V0Qm9keUNvbnRhaW5lcldpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1haW5Sb3dXaWR0aCA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0Qm9keUNvbnRhaW5lcldpZHRoKCkgKyBcInB4XCI7XG4gICAgdGhpcy5lQm9keUNvbnRhaW5lci5zdHlsZS53aWR0aCA9IG1haW5Sb3dXaWR0aDtcbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuc2V0UGlubmVkQ29sQ29udGFpbmVyV2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGlubmVkQ29sV2lkdGggPSB0aGlzLmNvbHVtbk1vZGVsLmdldFBpbm5lZENvbnRhaW5lcldpZHRoKCkgKyBcInB4XCI7XG4gICAgLy9NViBhZGRlZCBjb2RlXG4gICAgdmFyIHZpc2libGVDb2x1bW5zID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXREaXNwbGF5ZWRDb2x1bW5zKCk7XG4gICAgdmFyIHBpbm5lZFZpZXdQb3J0V2lkdGggPSBcIlwiO1xuICAgIGlmKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUGlubmVkQ29sQXV0b0V4cGFuZFdpZHRoKCkgJiYgdmlzaWJsZUNvbHVtbnNbdmlzaWJsZUNvbHVtbnMubGVuZ3RoIC0gMV0ucGlubmVkKVxuICAgIHtcbiAgICAgICAgcGlubmVkQ29sV2lkdGggPSBcIjk5JVwiO1xuICAgICAgICBwaW5uZWRWaWV3UG9ydFdpZHRoID0gXCI5OS41JVwiXG4gICAgfVxuICAgIHRoaXMuZVBpbm5lZENvbHNWaWV3cG9ydC5zdHlsZS53aWR0aCA9IHBpbm5lZFZpZXdQb3J0V2lkdGg7XG4gICAgLy9FbmQgTVYgYWRkZWQgY29kZVxuICAgIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXIuc3R5bGUud2lkdGggPSBwaW5uZWRDb2xXaWR0aDtcbiAgICB0aGlzLmVCb2R5Vmlld3BvcnRXcmFwcGVyLnN0eWxlLm1hcmdpbkxlZnQgPSBwaW5uZWRDb2xXaWR0aDtcbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuc2hvd1Bpbm5lZENvbENvbnRhaW5lcnNJZk5lZWRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIG5vIG5lZWQgdG8gZG8gdGhpcyBpZiBub3QgdXNpbmcgc2Nyb2xsc1xuICAgIGlmICh0aGlzLmZvclByaW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc2hvd2luZ1Bpbm5lZENvbHMgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRQaW5uZWRDb2xDb3VudCgpID4gMDtcblxuICAgIC8vc29tZSBicm93c2VycyBoYWQgbGF5b3V0IGlzc3VlcyB3aXRoIHRoZSBibGFuayBkaXZzLCBzbyBpZiBibGFuayxcbiAgICAvL3dlIGRvbid0IGRpc3BsYXkgdGhlbVxuICAgIGlmIChzaG93aW5nUGlubmVkQ29scykge1xuICAgICAgICB0aGlzLmVQaW5uZWRIZWFkZXIuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUtYmxvY2snO1xuICAgICAgICB0aGlzLmVQaW5uZWRDb2xzVmlld3BvcnQuc3R5bGUuZGlzcGxheSA9ICdpbmxpbmUnO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZVBpbm5lZEhlYWRlci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB0aGlzLmVQaW5uZWRDb2xzVmlld3BvcnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9XG59O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLnNldEhlYWRlckhlaWdodCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoZWFkZXJIZWlnaHQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRIZWFkZXJIZWlnaHQoKTtcbiAgICB2YXIgaGVhZGVySGVpZ2h0UGl4ZWxzID0gaGVhZGVySGVpZ2h0ICsgJ3B4JztcbiAgICBpZiAodGhpcy5mb3JQcmludCkge1xuICAgICAgICB0aGlzLmVIZWFkZXJDb250YWluZXIuc3R5bGVbJ2hlaWdodCddID0gaGVhZGVySGVpZ2h0UGl4ZWxzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZUhlYWRlci5zdHlsZVsnaGVpZ2h0J10gPSBoZWFkZXJIZWlnaHRQaXhlbHM7XG4gICAgICAgIHRoaXMuZUJvZHkuc3R5bGVbJ3BhZGRpbmdUb3AnXSA9IGhlYWRlckhlaWdodFBpeGVscztcbiAgICB9XG59O1xuXG4vLyBzZWUgaWYgYSBncmV5IGJveCBpcyBuZWVkZWQgYXQgdGhlIGJvdHRvbSBvZiB0aGUgcGlubmVkIGNvbFxuR3JpZFBhbmVsLnByb3RvdHlwZS5zZXRQaW5uZWRDb2xIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuZm9yUHJpbnQpIHtcbiAgICAgICAgdmFyIGJvZHlIZWlnaHQgPSB0aGlzLmVCb2R5Vmlld3BvcnQub2Zmc2V0SGVpZ2h0O1xuICAgICAgICB0aGlzLmVQaW5uZWRDb2xzVmlld3BvcnQuc3R5bGUuaGVpZ2h0ID0gYm9keUhlaWdodCArIFwicHhcIjtcbiAgICB9XG59O1xuXG5HcmlkUGFuZWwucHJvdG90eXBlLmFkZFNjcm9sbExpc3RlbmVyID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gaWYgcHJpbnRpbmcsIHRoZW4gbm8gc2Nyb2xsaW5nLCBzbyBubyBwb2ludCBpbiBsaXN0ZW5pbmcgZm9yIHNjcm9sbCBldmVudHNcbiAgICBpZiAodGhpcy5mb3JQcmludCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBsYXN0TGVmdFBvc2l0aW9uID0gLTE7XG4gICAgdmFyIGxhc3RUb3BQb3NpdGlvbiA9IC0xO1xuXG4gICAgdGhpcy5lQm9keVZpZXdwb3J0LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBuZXdMZWZ0UG9zaXRpb24gPSB0aGF0LmVCb2R5Vmlld3BvcnQuc2Nyb2xsTGVmdDtcbiAgICAgICAgdmFyIG5ld1RvcFBvc2l0aW9uID0gdGhhdC5lQm9keVZpZXdwb3J0LnNjcm9sbFRvcDtcblxuICAgICAgICBpZiAobmV3TGVmdFBvc2l0aW9uICE9PSBsYXN0TGVmdFBvc2l0aW9uKSB7XG4gICAgICAgICAgICBsYXN0TGVmdFBvc2l0aW9uID0gbmV3TGVmdFBvc2l0aW9uO1xuICAgICAgICAgICAgdGhhdC5zY3JvbGxIZWFkZXIobmV3TGVmdFBvc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdUb3BQb3NpdGlvbiAhPT0gbGFzdFRvcFBvc2l0aW9uKSB7XG4gICAgICAgICAgICBsYXN0VG9wUG9zaXRpb24gPSBuZXdUb3BQb3NpdGlvbjtcbiAgICAgICAgICAgIHRoYXQuc2Nyb2xsUGlubmVkKG5ld1RvcFBvc2l0aW9uKTtcbiAgICAgICAgICAgIHRoYXQucm93UmVuZGVyZXIuZHJhd1ZpcnR1YWxSb3dzKCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuZVBpbm5lZENvbHNWaWV3cG9ydC5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyB0aGlzIG1lYW5zIHRoZSBwaW5uZWQgcGFuZWwgd2FzIG1vdmVkLCB3aGljaCBjYW4gb25seVxuICAgICAgICAvLyBoYXBwZW4gd2hlbiB0aGUgdXNlciBpcyBuYXZpZ2F0aW5nIGluIHRoZSBwaW5uZWQgY29udGFpbmVyXG4gICAgICAgIC8vIGFzIHRoZSBwaW5uZWQgY29sIHNob3VsZCBuZXZlciBzY3JvbGwuIHNvIHdlIHJvbGxiYWNrXG4gICAgICAgIC8vIHRoZSBzY3JvbGwgb24gdGhlIHBpbm5lZC5cbiAgICAgICAgdGhhdC5lUGlubmVkQ29sc1ZpZXdwb3J0LnNjcm9sbFRvcCA9IDA7XG4gICAgfSk7XG5cbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuc2Nyb2xsSGVhZGVyID0gZnVuY3Rpb24oYm9keUxlZnRQb3NpdGlvbikge1xuICAgIC8vIHRoaXMuZUhlYWRlckNvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoJyArIC1ib2R5TGVmdFBvc2l0aW9uICsgXCJweCwwLDApXCI7XG4gICAgdGhpcy5lSGVhZGVyQ29udGFpbmVyLnN0eWxlLmxlZnQgPSAtYm9keUxlZnRQb3NpdGlvbiArIFwicHhcIjtcbn07XG5cbkdyaWRQYW5lbC5wcm90b3R5cGUuc2Nyb2xsUGlubmVkID0gZnVuY3Rpb24oYm9keVRvcFBvc2l0aW9uKSB7XG4gICAgLy8gdGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lci5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoMCwnICsgLWJvZHlUb3BQb3NpdGlvbiArIFwicHgsMClcIjtcbiAgICB0aGlzLmVQaW5uZWRDb2xzQ29udGFpbmVyLnN0eWxlLnRvcCA9IC1ib2R5VG9wUG9zaXRpb24gKyBcInB4XCI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyaWRQYW5lbDsiLCJtb2R1bGUuZXhwb3J0cyA9IFwiPGRpdiBjbGFzcz1hZy1sb2FkaW5nLXBhbmVsPjxkaXYgY2xhc3M9YWctbG9hZGluZy13cmFwcGVyPjxzcGFuIGNsYXNzPWFnLWxvYWRpbmctY2VudGVyPkxvYWRpbmcuLi48L3NwYW4+PC9kaXY+PC9kaXY+XCI7XG4iLCJmdW5jdGlvbiBHcm91cENyZWF0b3IoKSB7fVxuXG5Hcm91cENyZWF0b3IucHJvdG90eXBlLmdyb3VwID0gZnVuY3Rpb24ocm93Tm9kZXMsIGdyb3VwZWRDb2xzLCBncm91cEFnZ0Z1bmN0aW9uLCBleHBhbmRCeURlZmF1bHQpIHtcblxuICAgIHZhciB0b3BNb3N0R3JvdXAgPSB7XG4gICAgICAgIGxldmVsOiAtMSxcbiAgICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgICBjaGlsZHJlbk1hcDoge31cbiAgICB9O1xuXG4gICAgdmFyIGFsbEdyb3VwcyA9IFtdO1xuICAgIGFsbEdyb3Vwcy5wdXNoKHRvcE1vc3RHcm91cCk7XG5cbiAgICB2YXIgbGV2ZWxUb0luc2VydENoaWxkID0gZ3JvdXBlZENvbHMubGVuZ3RoIC0gMTtcbiAgICB2YXIgaSwgY3VycmVudExldmVsLCBub2RlLCBkYXRhLCBjdXJyZW50R3JvdXAsIGdyb3VwQnlGaWVsZCwgZ3JvdXBLZXksIG5leHRHcm91cDtcblxuICAgIC8vIHN0YXJ0IGF0IC0xIGFuZCBnbyBiYWNrd2FyZHMsIGFzIGFsbCB0aGUgcG9zaXRpdmUgaW5kZXhlc1xuICAgIC8vIGFyZSBhbHJlYWR5IHVzZWQgYnkgdGhlIG5vZGVzLlxuICAgIHZhciBpbmRleCA9IC0xO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHJvd05vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vZGUgPSByb3dOb2Rlc1tpXTtcbiAgICAgICAgZGF0YSA9IG5vZGUuZGF0YTtcblxuICAgICAgICAvLyBhbGwgbGVhZiBub2RlcyBoYXZlIHRoZSBzYW1lIGxldmVsIGluIHRoaXMgZ3JvdXBpbmcsIHdoaWNoIGlzIG9uZSBsZXZlbCBhZnRlciB0aGUgbGFzdCBncm91cFxuICAgICAgICBub2RlLmxldmVsID0gbGV2ZWxUb0luc2VydENoaWxkICsgMTtcblxuICAgICAgICBmb3IgKGN1cnJlbnRMZXZlbCA9IDA7IGN1cnJlbnRMZXZlbCA8IGdyb3VwZWRDb2xzLmxlbmd0aDsgY3VycmVudExldmVsKyspIHtcbiAgICAgICAgICAgIGdyb3VwQnlGaWVsZCA9IGdyb3VwZWRDb2xzW2N1cnJlbnRMZXZlbF0uY29sRGVmLmZpZWxkO1xuICAgICAgICAgICAgZ3JvdXBLZXkgPSBkYXRhW2dyb3VwQnlGaWVsZF07XG5cbiAgICAgICAgICAgIGlmIChjdXJyZW50TGV2ZWwgPT0gMCkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRHcm91cCA9IHRvcE1vc3RHcm91cDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgZ3JvdXAgZG9lc24ndCBleGlzdCB5ZXQsIGNyZWF0ZSBpdFxuICAgICAgICAgICAgbmV4dEdyb3VwID0gY3VycmVudEdyb3VwLmNoaWxkcmVuTWFwW2dyb3VwS2V5XTtcbiAgICAgICAgICAgIGlmICghbmV4dEdyb3VwKSB7XG4gICAgICAgICAgICAgICAgbmV4dEdyb3VwID0ge1xuICAgICAgICAgICAgICAgICAgICBncm91cDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZmllbGQ6IGdyb3VwQnlGaWVsZCxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGluZGV4LS0sXG4gICAgICAgICAgICAgICAgICAgIGtleTogZ3JvdXBLZXksXG4gICAgICAgICAgICAgICAgICAgIGV4cGFuZGVkOiB0aGlzLmlzRXhwYW5kZWQoZXhwYW5kQnlEZWZhdWx0LCBjdXJyZW50TGV2ZWwpLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciB0b3AgbW9zdCBsZXZlbCwgcGFyZW50IGlzIG51bGxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBjdXJyZW50R3JvdXAgPT09IHRvcE1vc3RHcm91cCA/IG51bGwgOiBjdXJyZW50R3JvdXAsXG4gICAgICAgICAgICAgICAgICAgIGFsbENoaWxkcmVuQ291bnQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIGxldmVsOiBjdXJyZW50R3JvdXAubGV2ZWwgKyAxLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbk1hcDoge30gLy90aGlzIGlzIGEgdGVtcG9yYXJ5IG1hcCwgd2UgcmVtb3ZlIGF0IHRoZSBlbmQgb2YgdGhpcyBtZXRob2RcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGN1cnJlbnRHcm91cC5jaGlsZHJlbk1hcFtncm91cEtleV0gPSBuZXh0R3JvdXA7XG4gICAgICAgICAgICAgICAgY3VycmVudEdyb3VwLmNoaWxkcmVuLnB1c2gobmV4dEdyb3VwKTtcbiAgICAgICAgICAgICAgICBhbGxHcm91cHMucHVzaChuZXh0R3JvdXApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXh0R3JvdXAuYWxsQ2hpbGRyZW5Db3VudCsrO1xuXG4gICAgICAgICAgICBpZiAoY3VycmVudExldmVsID09IGxldmVsVG9JbnNlcnRDaGlsZCkge1xuICAgICAgICAgICAgICAgIG5vZGUucGFyZW50ID0gbmV4dEdyb3VwID09PSB0b3BNb3N0R3JvdXAgPyBudWxsIDogbmV4dEdyb3VwO1xuICAgICAgICAgICAgICAgIG5leHRHcm91cC5jaGlsZHJlbi5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50R3JvdXAgPSBuZXh0R3JvdXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8vcmVtb3ZlIHRoZSB0ZW1wb3JhcnkgbWFwXG4gICAgZm9yIChpID0gMDsgaSA8IGFsbEdyb3Vwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkZWxldGUgYWxsR3JvdXBzW2ldLmNoaWxkcmVuTWFwO1xuICAgIH1cblxuICAgIHJldHVybiB0b3BNb3N0R3JvdXAuY2hpbGRyZW47XG59O1xuXG5Hcm91cENyZWF0b3IucHJvdG90eXBlLmlzRXhwYW5kZWQgPSBmdW5jdGlvbihleHBhbmRCeURlZmF1bHQsIGxldmVsKSB7XG4gICAgaWYgKHR5cGVvZiBleHBhbmRCeURlZmF1bHQgPT09ICdudW1iZXInKSB7XG4gICAgICAgIHJldHVybiBsZXZlbCA8IGV4cGFuZEJ5RGVmYXVsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZXhwYW5kQnlEZWZhdWx0ID09PSB0cnVlIHx8IGV4cGFuZEJ5RGVmYXVsdCA9PT0gJ3RydWUnO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IEdyb3VwQ3JlYXRvcigpO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIFN2Z0ZhY3RvcnkgPSByZXF1aXJlKCcuL3N2Z0ZhY3RvcnknKTtcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xuXG52YXIgc3ZnRmFjdG9yeSA9IG5ldyBTdmdGYWN0b3J5KCk7XG5cbmZ1bmN0aW9uIEhlYWRlclJlbmRlcmVyKCkge31cblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbkNvbnRyb2xsZXIsIGNvbHVtbk1vZGVsLCBncmlkUGFuZWwsIGFuZ3VsYXJHcmlkLCBmaWx0ZXJNYW5hZ2VyLCAkc2NvcGUsICRjb21waWxlLCBleHByZXNzaW9uU2VydmljZSkge1xuICAgIHRoaXMuZXhwcmVzc2lvblNlcnZpY2UgPSBleHByZXNzaW9uU2VydmljZTtcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcbiAgICB0aGlzLmNvbHVtbk1vZGVsID0gY29sdW1uTW9kZWw7XG4gICAgdGhpcy5jb2x1bW5Db250cm9sbGVyID0gY29sdW1uQ29udHJvbGxlcjtcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XG4gICAgdGhpcy5maWx0ZXJNYW5hZ2VyID0gZmlsdGVyTWFuYWdlcjtcbiAgICB0aGlzLiRzY29wZSA9ICRzY29wZTtcbiAgICB0aGlzLiRjb21waWxlID0gJGNvbXBpbGU7XG4gICAgdGhpcy5maW5kQWxsRWxlbWVudHMoZ3JpZFBhbmVsKTtcbn07XG5cbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5maW5kQWxsRWxlbWVudHMgPSBmdW5jdGlvbihncmlkUGFuZWwpIHtcbiAgICB0aGlzLmVQaW5uZWRIZWFkZXIgPSBncmlkUGFuZWwuZ2V0UGlubmVkSGVhZGVyKCk7XG4gICAgdGhpcy5lSGVhZGVyQ29udGFpbmVyID0gZ3JpZFBhbmVsLmdldEhlYWRlckNvbnRhaW5lcigpO1xuICAgIHRoaXMuZUhlYWRlciA9IGdyaWRQYW5lbC5nZXRIZWFkZXIoKTtcbiAgICB0aGlzLmVSb290ID0gZ3JpZFBhbmVsLmdldFJvb3QoKTtcbn07XG5cbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5yZWZyZXNoSGVhZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lUGlubmVkSGVhZGVyKTtcbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbih0aGlzLmVIZWFkZXJDb250YWluZXIpO1xuXG4gICAgaWYgKHRoaXMuY2hpbGRTY29wZXMpIHtcbiAgICAgICAgdGhpcy5jaGlsZFNjb3Blcy5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU2NvcGUpIHtcbiAgICAgICAgICAgIGNoaWxkU2NvcGUuJGRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuY2hpbGRTY29wZXMgPSBbXTtcblxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwSGVhZGVycygpKSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0SGVhZGVyc1dpdGhHcm91cGluZygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0SGVhZGVyc1dpdGhvdXRHcm91cGluZygpO1xuICAgIH1cblxufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmluc2VydEhlYWRlcnNXaXRoR3JvdXBpbmcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZ3JvdXBzID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXRIZWFkZXJHcm91cHMoKTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgZ3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHtcbiAgICAgICAgdmFyIGVIZWFkZXJDZWxsID0gdGhhdC5jcmVhdGVHcm91cGVkSGVhZGVyQ2VsbChncm91cCk7XG4gICAgICAgIHZhciBlQ29udGFpbmVyVG9BZGRUbyA9IGdyb3VwLnBpbm5lZCA/IHRoYXQuZVBpbm5lZEhlYWRlciA6IHRoYXQuZUhlYWRlckNvbnRhaW5lcjtcbiAgICAgICAgZUNvbnRhaW5lclRvQWRkVG8uYXBwZW5kQ2hpbGQoZUhlYWRlckNlbGwpO1xuICAgIH0pO1xufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUdyb3VwZWRIZWFkZXJDZWxsID0gZnVuY3Rpb24oZ3JvdXApIHtcblxuICAgIHZhciBlSGVhZGVyR3JvdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlSGVhZGVyR3JvdXAuY2xhc3NOYW1lID0gJ2FnLWhlYWRlci1ncm91cCc7XG5cbiAgICB2YXIgZUhlYWRlckdyb3VwQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGdyb3VwLmVIZWFkZXJHcm91cENlbGwgPSBlSGVhZGVyR3JvdXBDZWxsO1xuICAgIHZhciBjbGFzc05hbWVzID0gWydhZy1oZWFkZXItZ3JvdXAtY2VsbCddO1xuICAgIC8vIGhhdmluZyBkaWZmZXJlbnQgY2xhc3NlcyBiZWxvdyBhbGxvd3MgdGhlIHN0eWxlIHRvIG5vdCBoYXZlIGEgYm90dG9tIGJvcmRlclxuICAgIC8vIG9uIHRoZSBncm91cCBoZWFkZXIsIGlmIG5vIGdyb3VwIGlzIHNwZWNpZmllZFxuICAgIGlmIChncm91cC5uYW1lKSB7XG4gICAgICAgIGNsYXNzTmFtZXMucHVzaCgnYWctaGVhZGVyLWdyb3VwLWNlbGwtd2l0aC1ncm91cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNsYXNzTmFtZXMucHVzaCgnYWctaGVhZGVyLWdyb3VwLWNlbGwtbm8tZ3JvdXAnKTtcbiAgICB9XG4gICAgaWYgKGdyb3VwLmV4cGFuZGFibGUgJiYgIWdyb3VwLmV4cGFuZGVkKSB7XG4gICAgICAgIGNsYXNzTmFtZXMucHVzaCgnYWctaGVhZGVyLWdyb3VwLWNvbGxhcHNlZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNsYXNzTmFtZXMucHVzaCgnYWctaGVhZGVyLWdyb3VwLWV4cGFuZGVkJyk7XG4gICAgfVxuICAgIGVIZWFkZXJHcm91cENlbGwuY2xhc3NOYW1lID0gY2xhc3NOYW1lcy5qb2luKCcgJyk7XG5cbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVDb2xSZXNpemUoKSkge1xuICAgICAgICB2YXIgZUhlYWRlckNlbGxSZXNpemUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBlSGVhZGVyQ2VsbFJlc2l6ZS5jbGFzc05hbWUgPSBcImFnLWhlYWRlci1jZWxsLXJlc2l6ZVwiO1xuICAgICAgICBlSGVhZGVyR3JvdXBDZWxsLmFwcGVuZENoaWxkKGVIZWFkZXJDZWxsUmVzaXplKTtcbiAgICAgICAgZ3JvdXAuZUhlYWRlckNlbGxSZXNpemUgPSBlSGVhZGVyQ2VsbFJlc2l6ZTtcbiAgICAgICAgdmFyIGRyYWdDYWxsYmFjayA9IHRoaXMuZ3JvdXBEcmFnQ2FsbGJhY2tGYWN0b3J5KGdyb3VwKTtcbiAgICAgICAgdGhpcy5hZGREcmFnSGFuZGxlcihlSGVhZGVyQ2VsbFJlc2l6ZSwgZHJhZ0NhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBubyByZW5kZXJlciwgZGVmYXVsdCB0ZXh0IHJlbmRlclxuICAgIHZhciBncm91cE5hbWUgPSBncm91cC5uYW1lO1xuICAgIGlmIChncm91cE5hbWUgJiYgZ3JvdXBOYW1lICE9PSAnJykge1xuICAgICAgICB2YXIgZUdyb3VwQ2VsbExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgZUdyb3VwQ2VsbExhYmVsLmNsYXNzTmFtZSA9ICdhZy1oZWFkZXItZ3JvdXAtY2VsbC1sYWJlbCc7XG4gICAgICAgIGVIZWFkZXJHcm91cENlbGwuYXBwZW5kQ2hpbGQoZUdyb3VwQ2VsbExhYmVsKTtcblxuICAgICAgICB2YXIgZUlubmVyVGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICBlSW5uZXJUZXh0LmNsYXNzTmFtZSA9ICdhZy1oZWFkZXItZ3JvdXAtdGV4dCc7XG4gICAgICAgIGVJbm5lclRleHQuaW5uZXJIVE1MID0gZ3JvdXBOYW1lO1xuICAgICAgICBlR3JvdXBDZWxsTGFiZWwuYXBwZW5kQ2hpbGQoZUlubmVyVGV4dCk7XG5cbiAgICAgICAgaWYgKGdyb3VwLmV4cGFuZGFibGUpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkR3JvdXBFeHBhbmRJY29uKGdyb3VwLCBlR3JvdXBDZWxsTGFiZWwsIGdyb3VwLmV4cGFuZGVkKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlSGVhZGVyR3JvdXAuYXBwZW5kQ2hpbGQoZUhlYWRlckdyb3VwQ2VsbCk7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgZ3JvdXAuZGlzcGxheWVkQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtbikge1xuICAgICAgICB2YXIgZUhlYWRlckNlbGwgPSB0aGF0LmNyZWF0ZUhlYWRlckNlbGwoY29sdW1uLCB0cnVlLCBncm91cCk7XG4gICAgICAgIGVIZWFkZXJHcm91cC5hcHBlbmRDaGlsZChlSGVhZGVyQ2VsbCk7XG4gICAgfSk7XG5cbiAgICB0aGF0LnNldFdpZHRoT2ZHcm91cEhlYWRlckNlbGwoZ3JvdXApO1xuXG4gICAgcmV0dXJuIGVIZWFkZXJHcm91cDtcbn07XG5cbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5hZGRHcm91cEV4cGFuZEljb24gPSBmdW5jdGlvbihncm91cCwgZUhlYWRlckdyb3VwLCBleHBhbmRlZCkge1xuICAgIHZhciBlR3JvdXBJY29uO1xuICAgIGlmIChleHBhbmRlZCkge1xuICAgICAgICBlR3JvdXBJY29uID0gdXRpbHMuY3JlYXRlSWNvbignaGVhZGVyR3JvdXBPcGVuZWQnLCB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciwgbnVsbCwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd0xlZnRTdmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVHcm91cEljb24gPSB1dGlscy5jcmVhdGVJY29uKCdoZWFkZXJHcm91cENsb3NlZCcsIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLCBudWxsLCBzdmdGYWN0b3J5LmNyZWF0ZUFycm93UmlnaHRTdmcpO1xuICAgIH1cbiAgICBlR3JvdXBJY29uLmNsYXNzTmFtZSA9ICdhZy1oZWFkZXItZXhwYW5kLWljb24nO1xuICAgIGVIZWFkZXJHcm91cC5hcHBlbmRDaGlsZChlR3JvdXBJY29uKTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBlR3JvdXBJY29uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLmhlYWRlckdyb3VwT3BlbmVkKGdyb3VwKTtcbiAgICB9O1xufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmFkZERyYWdIYW5kbGVyID0gZnVuY3Rpb24oZURyYWdnYWJsZUVsZW1lbnQsIGRyYWdDYWxsYmFjaykge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBlRHJhZ2dhYmxlRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbihkb3duRXZlbnQpIHtcbiAgICAgICAgZHJhZ0NhbGxiYWNrLm9uRHJhZ1N0YXJ0KCk7XG4gICAgICAgIHRoYXQuZVJvb3Quc3R5bGUuY3Vyc29yID0gXCJjb2wtcmVzaXplXCI7XG4gICAgICAgIHRoYXQuZHJhZ1N0YXJ0WCA9IGRvd25FdmVudC5jbGllbnRYO1xuXG4gICAgICAgIHZhciBsaXN0ZW5lcnNUb1JlbW92ZSA9IHt9O1xuXG4gICAgICAgIGxpc3RlbmVyc1RvUmVtb3ZlLm1vdXNlbW92ZSA9IGZ1bmN0aW9uIChtb3ZlRXZlbnQpIHtcbiAgICAgICAgICAgIHZhciBuZXdYID0gbW92ZUV2ZW50LmNsaWVudFg7XG4gICAgICAgICAgICB2YXIgY2hhbmdlID0gbmV3WCAtIHRoYXQuZHJhZ1N0YXJ0WDtcbiAgICAgICAgICAgIGRyYWdDYWxsYmFjay5vbkRyYWdnaW5nKGNoYW5nZSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgbGlzdGVuZXJzVG9SZW1vdmUubW91c2V1cCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoYXQuc3RvcERyYWdnaW5nKGxpc3RlbmVyc1RvUmVtb3ZlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBsaXN0ZW5lcnNUb1JlbW92ZS5tb3VzZWxlYXZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhhdC5zdG9wRHJhZ2dpbmcobGlzdGVuZXJzVG9SZW1vdmUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoYXQuZVJvb3QuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgbGlzdGVuZXJzVG9SZW1vdmUubW91c2Vtb3ZlKTtcbiAgICAgICAgdGhhdC5lUm9vdC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgbGlzdGVuZXJzVG9SZW1vdmUubW91c2V1cCk7XG4gICAgICAgIHRoYXQuZVJvb3QuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIGxpc3RlbmVyc1RvUmVtb3ZlLm1vdXNlbGVhdmUpO1xuICAgIH0pO1xufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLnNldFdpZHRoT2ZHcm91cEhlYWRlckNlbGwgPSBmdW5jdGlvbihoZWFkZXJHcm91cCkge1xuICAgIHZhciB0b3RhbFdpZHRoID0gMDtcbiAgICBoZWFkZXJHcm91cC5kaXNwbGF5ZWRDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgIHRvdGFsV2lkdGggKz0gY29sdW1uLmFjdHVhbFdpZHRoO1xuICAgIH0pO1xuICAgIGhlYWRlckdyb3VwLmVIZWFkZXJHcm91cENlbGwuc3R5bGUud2lkdGggPSB1dGlscy5mb3JtYXRXaWR0aCh0b3RhbFdpZHRoKTtcbiAgICBoZWFkZXJHcm91cC5hY3R1YWxXaWR0aCA9IHRvdGFsV2lkdGg7XG59O1xuXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuaW5zZXJ0SGVhZGVyc1dpdGhvdXRHcm91cGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlUGlubmVkSGVhZGVyID0gdGhpcy5lUGlubmVkSGVhZGVyO1xuICAgIHZhciBlSGVhZGVyQ29udGFpbmVyID0gdGhpcy5lSGVhZGVyQ29udGFpbmVyO1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheWVkQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgIC8vIG9ubHkgaW5jbHVkZSB0aGUgZmlyc3QgeCBjb2xzXG4gICAgICAgIHZhciBoZWFkZXJDZWxsID0gdGhhdC5jcmVhdGVIZWFkZXJDZWxsKGNvbHVtbiwgZmFsc2UpO1xuICAgICAgICBpZiAoY29sdW1uLnBpbm5lZCkge1xuICAgICAgICAgICAgZVBpbm5lZEhlYWRlci5hcHBlbmRDaGlsZChoZWFkZXJDZWxsKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVIZWFkZXJDb250YWluZXIuYXBwZW5kQ2hpbGQoaGVhZGVyQ2VsbCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIHByaXZhdGVcbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5hZGRIb3Zlckxpc3RlbmVyID0gZnVuY3Rpb24oY29sRGVmLCBoZWFkZXJDZWxsTGFiZWwpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgaWYgKGNvbERlZi5oZWFkZXJIb3ZlckhhbmRsZXIpIHtcbiAgICAgICAgaGVhZGVyQ2VsbExhYmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWVudGVyXCIsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICB2YXIgaG92ZXJQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGUsXG4gICAgICAgICAgICAgICAgZW50ZXJpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgbGVhdmluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgY29udGV4dDogdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxuICAgICAgICAgICAgICAgIGFwaTogdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb2xEZWYuaGVhZGVySG92ZXJIYW5kbGVyKGhvdmVyUGFyYW1zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGhlYWRlckNlbGxMYWJlbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgdmFyIGhvdmVyUGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxuICAgICAgICAgICAgICAgIGV2ZW50OiBlLFxuICAgICAgICAgICAgICAgIGVudGVyaW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBsZWF2aW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKSxcbiAgICAgICAgICAgICAgICBhcGk6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29sRGVmLmhlYWRlckhvdmVySGFuZGxlcihob3ZlclBhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVIZWFkZXJDZWxsID0gZnVuY3Rpb24oY29sdW1uLCBncm91cGVkLCBoZWFkZXJHcm91cCkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcbiAgICB2YXIgZUhlYWRlckNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIC8vIHN0aWNrIHRoZSBoZWFkZXIgY2VsbCBpbiBjb2x1bW4sIGFzIHdlIGFjY2VzcyBpdCB3aGVuIGdyb3VwIGlzIHJlLXNpemVkXG4gICAgY29sdW1uLmVIZWFkZXJDZWxsID0gZUhlYWRlckNlbGw7XG5cbiAgICB2YXIgbmV3Q2hpbGRTY29wZTtcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZUhlYWRlcnMoKSkge1xuICAgICAgICBuZXdDaGlsZFNjb3BlID0gdGhpcy4kc2NvcGUuJG5ldygpO1xuICAgICAgICBuZXdDaGlsZFNjb3BlLmNvbERlZiA9IGNvbERlZjtcbiAgICAgICAgbmV3Q2hpbGRTY29wZS5jb2xJbmRleCA9IGNvbERlZi5pbmRleDtcbiAgICAgICAgbmV3Q2hpbGRTY29wZS5jb2xEZWZXcmFwcGVyID0gY29sdW1uO1xuICAgICAgICB0aGlzLmNoaWxkU2NvcGVzLnB1c2gobmV3Q2hpbGRTY29wZSk7XG4gICAgfVxuXG4gICAgdmFyIGhlYWRlckNlbGxDbGFzc2VzID0gWydhZy1oZWFkZXItY2VsbCddO1xuICAgIGlmIChncm91cGVkKSB7XG4gICAgICAgIGhlYWRlckNlbGxDbGFzc2VzLnB1c2goJ2FnLWhlYWRlci1jZWxsLWdyb3VwZWQnKTsgLy8gdGhpcyB0YWtlcyA1MCUgaGVpZ2h0XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaGVhZGVyQ2VsbENsYXNzZXMucHVzaCgnYWctaGVhZGVyLWNlbGwtbm90LWdyb3VwZWQnKTsgLy8gdGhpcyB0YWtlcyAxMDAlIGhlaWdodFxuICAgIH1cbiAgICBlSGVhZGVyQ2VsbC5jbGFzc05hbWUgPSBoZWFkZXJDZWxsQ2xhc3Nlcy5qb2luKCcgJyk7XG5cbiAgICB0aGlzLmFkZEhlYWRlckNsYXNzZXNGcm9tQ29sbERlZihjb2xEZWYsIG5ld0NoaWxkU2NvcGUsIGVIZWFkZXJDZWxsKTtcblxuICAgIC8vIGFkZCB0b29sdGlwIGlmIGV4aXN0c1xuICAgIGlmIChjb2xEZWYuaGVhZGVyVG9vbHRpcCkge1xuICAgICAgICBlSGVhZGVyQ2VsbC50aXRsZSA9IGNvbERlZi5oZWFkZXJUb29sdGlwO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZUNvbFJlc2l6ZSgpICYmICFjb2xEZWYuc3VwcHJlc3NSZXNpemUpIHtcbiAgICAgICAgdmFyIGhlYWRlckNlbGxSZXNpemUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICBoZWFkZXJDZWxsUmVzaXplLmNsYXNzTmFtZSA9IFwiYWctaGVhZGVyLWNlbGwtcmVzaXplXCI7XG4gICAgICAgIGVIZWFkZXJDZWxsLmFwcGVuZENoaWxkKGhlYWRlckNlbGxSZXNpemUpO1xuICAgICAgICB2YXIgZHJhZ0NhbGxiYWNrID0gdGhpcy5oZWFkZXJEcmFnQ2FsbGJhY2tGYWN0b3J5KGVIZWFkZXJDZWxsLCBjb2x1bW4sIGhlYWRlckdyb3VwKTtcbiAgICAgICAgdGhpcy5hZGREcmFnSGFuZGxlcihoZWFkZXJDZWxsUmVzaXplLCBkcmFnQ2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8vIGZpbHRlciBidXR0b25cbiAgICB2YXIgc2hvd01lbnUgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0VuYWJsZUZpbHRlcigpICYmICFjb2xEZWYuc3VwcHJlc3NNZW51O1xuICAgIGlmIChzaG93TWVudSkge1xuICAgICAgICB2YXIgZU1lbnVCdXR0b24gPSB1dGlscy5jcmVhdGVJY29uKCdtZW51JywgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbiwgc3ZnRmFjdG9yeS5jcmVhdGVNZW51U3ZnKTtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZU1lbnVCdXR0b24sICdhZy1oZWFkZXItaWNvbicpO1xuXG4gICAgICAgIGVNZW51QnV0dG9uLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIFwiYWctaGVhZGVyLWNlbGwtbWVudS1idXR0b25cIik7XG4gICAgICAgIGVNZW51QnV0dG9uLm9uY2xpY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoYXQuZmlsdGVyTWFuYWdlci5zaG93RmlsdGVyKGNvbHVtbiwgdGhpcyk7XG4gICAgICAgIH07XG4gICAgICAgIGVIZWFkZXJDZWxsLmFwcGVuZENoaWxkKGVNZW51QnV0dG9uKTtcbiAgICAgICAgZUhlYWRlckNlbGwub25tb3VzZWVudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlTWVudUJ1dHRvbi5zdHlsZS5vcGFjaXR5ID0gMTtcbiAgICAgICAgfTtcbiAgICAgICAgZUhlYWRlckNlbGwub25tb3VzZWxlYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlTWVudUJ1dHRvbi5zdHlsZS5vcGFjaXR5ID0gMDtcbiAgICAgICAgfTtcbiAgICAgICAgZU1lbnVCdXR0b24uc3R5bGUub3BhY2l0eSA9IDA7XG4gICAgICAgIGVNZW51QnV0dG9uLnN0eWxlW1wiLXdlYmtpdC10cmFuc2l0aW9uXCJdID0gXCJvcGFjaXR5IDAuNXMsIGJvcmRlciAwLjJzXCI7XG4gICAgICAgIGVNZW51QnV0dG9uLnN0eWxlW1widHJhbnNpdGlvblwiXSA9IFwib3BhY2l0eSAwLjVzLCBib3JkZXIgMC4yc1wiO1xuICAgIH1cblxuICAgIC8vIGxhYmVsIGRpdlxuICAgIHZhciBoZWFkZXJDZWxsTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGhlYWRlckNlbGxMYWJlbC5jbGFzc05hbWUgPSBcImFnLWhlYWRlci1jZWxsLWxhYmVsXCI7XG5cbiAgICB0aGlzLmFkZEhvdmVyTGlzdGVuZXIoY29sRGVmLCBoZWFkZXJDZWxsTGFiZWwpO1xuXG4gICAgLy8gYWRkIGluIHNvcnQgaWNvbnNcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVTb3J0aW5nKCkgJiYgIWNvbERlZi5zdXBwcmVzc1NvcnRpbmcpIHtcbiAgICAgICAgY29sdW1uLmVTb3J0QXNjID0gdXRpbHMuY3JlYXRlSWNvbignc29ydEFzY2VuZGluZycsIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW4sIHN2Z0ZhY3RvcnkuY3JlYXRlQXJyb3dEb3duU3ZnKTtcbiAgICAgICAgY29sdW1uLmVTb3J0RGVzYyA9IHV0aWxzLmNyZWF0ZUljb24oJ3NvcnREZXNjZW5kaW5nJywgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbiwgc3ZnRmFjdG9yeS5jcmVhdGVBcnJvd1VwU3ZnKTtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoY29sdW1uLmVTb3J0QXNjLCAnYWctaGVhZGVyLWljb24nKTtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoY29sdW1uLmVTb3J0RGVzYywgJ2FnLWhlYWRlci1pY29uJyk7XG4gICAgICAgIGhlYWRlckNlbGxMYWJlbC5hcHBlbmRDaGlsZChjb2x1bW4uZVNvcnRBc2MpO1xuICAgICAgICBoZWFkZXJDZWxsTGFiZWwuYXBwZW5kQ2hpbGQoY29sdW1uLmVTb3J0RGVzYyk7XG4gICAgICAgIGNvbHVtbi5lU29ydEFzYy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBjb2x1bW4uZVNvcnREZXNjLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIHRoaXMuYWRkU29ydEhhbmRsaW5nKGhlYWRlckNlbGxMYWJlbCwgY29sdW1uKTtcbiAgICB9IGVsc2UgaWYgKGNvbERlZi5oZWFkZXJDbGlja0hhbmRsZXIpIHtcbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxuICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxuICAgICAgICAgICAgYXBpOiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKVxuICAgICAgICB9O1xuICAgICAgICBoZWFkZXJDZWxsTGFiZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHBhcmFtcy5ldmVudCA9IGU7XG4gICAgICAgICAgICBjb2xEZWYuaGVhZGVyQ2xpY2tIYW5kbGVyKHBhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGFkZCBpbiBmaWx0ZXIgaWNvblxuICAgIGNvbHVtbi5lRmlsdGVySWNvbiA9IHV0aWxzLmNyZWF0ZUljb24oJ2ZpbHRlcicsIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW4sIHN2Z0ZhY3RvcnkuY3JlYXRlRmlsdGVyU3ZnKTtcbiAgICB1dGlscy5hZGRDc3NDbGFzcyhjb2x1bW4uZUZpbHRlckljb24sICdhZy1oZWFkZXItaWNvbicpO1xuICAgIGhlYWRlckNlbGxMYWJlbC5hcHBlbmRDaGlsZChjb2x1bW4uZUZpbHRlckljb24pO1xuXG4gICAgLy8gcmVuZGVyIHRoZSBjZWxsLCB1c2UgYSByZW5kZXJlciBpZiBvbmUgaXMgcHJvdmlkZWRcbiAgICB2YXIgaGVhZGVyQ2VsbFJlbmRlcmVyO1xuICAgIGlmIChjb2xEZWYuaGVhZGVyQ2VsbFJlbmRlcmVyKSB7IC8vIGZpcnN0IGxvb2sgZm9yIGEgcmVuZGVyZXIgaW4gY29sIGRlZlxuICAgICAgICBoZWFkZXJDZWxsUmVuZGVyZXIgPSBjb2xEZWYuaGVhZGVyQ2VsbFJlbmRlcmVyO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0SGVhZGVyQ2VsbFJlbmRlcmVyKCkpIHsgLy8gc2Vjb25kIGxvb2sgZm9yIG9uZSBpbiBncmlkIG9wdGlvbnNcbiAgICAgICAgaGVhZGVyQ2VsbFJlbmRlcmVyID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0SGVhZGVyQ2VsbFJlbmRlcmVyKCk7XG4gICAgfVxuXG4gICAgdmFyIGhlYWRlck5hbWVWYWx1ZSA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheU5hbWVGb3JDb2woY29sdW1uKTtcblxuICAgIGlmIChoZWFkZXJDZWxsUmVuZGVyZXIpIHtcbiAgICAgICAgLy8gcmVuZGVyZXIgcHJvdmlkZWQsIHVzZSBpdFxuICAgICAgICB2YXIgY2VsbFJlbmRlcmVyUGFyYW1zID0ge1xuICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICAkc2NvcGU6IG5ld0NoaWxkU2NvcGUsXG4gICAgICAgICAgICBjb250ZXh0OiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KCksXG4gICAgICAgICAgICB2YWx1ZTogaGVhZGVyTmFtZVZhbHVlLFxuICAgICAgICAgICAgYXBpOiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKVxuICAgICAgICB9O1xuICAgICAgICB2YXIgY2VsbFJlbmRlcmVyUmVzdWx0ID0gaGVhZGVyQ2VsbFJlbmRlcmVyKGNlbGxSZW5kZXJlclBhcmFtcyk7XG4gICAgICAgIHZhciBjaGlsZFRvQXBwZW5kO1xuICAgICAgICBpZiAodXRpbHMuaXNOb2RlT3JFbGVtZW50KGNlbGxSZW5kZXJlclJlc3VsdCkpIHtcbiAgICAgICAgICAgIC8vIGEgZG9tIG5vZGUgb3IgZWxlbWVudCB3YXMgcmV0dXJuZWQsIHNvIGFkZCBjaGlsZFxuICAgICAgICAgICAgY2hpbGRUb0FwcGVuZCA9IGNlbGxSZW5kZXJlclJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSBhc3N1bWUgaXQgd2FzIGh0bWwsIHNvIGp1c3QgaW5zZXJ0XG4gICAgICAgICAgICB2YXIgZVRleHRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgICAgICBlVGV4dFNwYW4uaW5uZXJIVE1MID0gY2VsbFJlbmRlcmVyUmVzdWx0O1xuICAgICAgICAgICAgY2hpbGRUb0FwcGVuZCA9IGVUZXh0U3BhbjtcbiAgICAgICAgfVxuICAgICAgICAvLyBhbmd1bGFyIGNvbXBpbGUgaGVhZGVyIGlmIG9wdGlvbiBpcyB0dXJuZWQgb25cbiAgICAgICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzQW5ndWxhckNvbXBpbGVIZWFkZXJzKCkpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZFRvQXBwZW5kQ29tcGlsZWQgPSB0aGlzLiRjb21waWxlKGNoaWxkVG9BcHBlbmQpKG5ld0NoaWxkU2NvcGUpWzBdO1xuICAgICAgICAgICAgaGVhZGVyQ2VsbExhYmVsLmFwcGVuZENoaWxkKGNoaWxkVG9BcHBlbmRDb21waWxlZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBoZWFkZXJDZWxsTGFiZWwuYXBwZW5kQ2hpbGQoY2hpbGRUb0FwcGVuZCk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBubyByZW5kZXJlciwgZGVmYXVsdCB0ZXh0IHJlbmRlclxuICAgICAgICB2YXIgZUlubmVyVGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICBlSW5uZXJUZXh0LmNsYXNzTmFtZSA9ICdhZy1oZWFkZXItY2VsbC10ZXh0JztcbiAgICAgICAgZUlubmVyVGV4dC5pbm5lckhUTUwgPSBoZWFkZXJOYW1lVmFsdWU7XG4gICAgICAgIGhlYWRlckNlbGxMYWJlbC5hcHBlbmRDaGlsZChlSW5uZXJUZXh0KTtcbiAgICB9XG5cbiAgICBlSGVhZGVyQ2VsbC5hcHBlbmRDaGlsZChoZWFkZXJDZWxsTGFiZWwpO1xuICAgIGVIZWFkZXJDZWxsLnN0eWxlLndpZHRoID0gdXRpbHMuZm9ybWF0V2lkdGgoY29sdW1uLmFjdHVhbFdpZHRoKTtcblxuICAgIHJldHVybiBlSGVhZGVyQ2VsbDtcbn07XG5cbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5hZGRIZWFkZXJDbGFzc2VzRnJvbUNvbGxEZWYgPSBmdW5jdGlvbihjb2xEZWYsICRjaGlsZFNjb3BlLCBlSGVhZGVyQ2VsbCkge1xuICAgIGlmIChjb2xEZWYuaGVhZGVyQ2xhc3MpIHtcbiAgICAgICAgdmFyIGNsYXNzVG9Vc2U7XG4gICAgICAgIGlmICh0eXBlb2YgY29sRGVmLmhlYWRlckNsYXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxuICAgICAgICAgICAgICAgICRzY29wZTogJGNoaWxkU2NvcGUsXG4gICAgICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxuICAgICAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjbGFzc1RvVXNlID0gY29sRGVmLmhlYWRlckNsYXNzKHBhcmFtcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbGFzc1RvVXNlID0gY29sRGVmLmhlYWRlckNsYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbGFzc1RvVXNlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZUhlYWRlckNlbGwsIGNsYXNzVG9Vc2UpO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoY2xhc3NUb1VzZSkpIHtcbiAgICAgICAgICAgIGNsYXNzVG9Vc2UuZm9yRWFjaChmdW5jdGlvbihjc3NDbGFzc0l0ZW0pIHtcbiAgICAgICAgICAgICAgICB1dGlscy5hZGRDc3NDbGFzcyhlSGVhZGVyQ2VsbCwgY3NzQ2xhc3NJdGVtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmdldE5leHRTb3J0RGlyZWN0aW9uID0gZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgdmFyIHN1cHByZXNzVW5Tb3J0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNTdXBwcmVzc1VuU29ydCgpO1xuICAgIHZhciBzdXBwcmVzc0Rlc2NTb3J0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNTdXBwcmVzc0Rlc2NTb3J0KCk7XG5cbiAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5ERVNDOlxuICAgICAgICAgICAgaWYgKHN1cHByZXNzVW5Tb3J0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnN0YW50cy5BU0M7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICBjYXNlIGNvbnN0YW50cy5BU0M6XG4gICAgICAgICAgICBpZiAoc3VwcHJlc3NVblNvcnQgJiYgc3VwcHJlc3NEZXNjU29ydCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb25zdGFudHMuQVNDO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdXBwcmVzc0Rlc2NTb3J0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb25zdGFudHMuREVTQztcbiAgICAgICAgICAgIH1cbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgICByZXR1cm4gY29uc3RhbnRzLkFTQztcbiAgICB9XG59O1xuXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuYWRkU29ydEhhbmRsaW5nID0gZnVuY3Rpb24oaGVhZGVyQ2VsbExhYmVsLCBjb2x1bW4pIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICBoZWFkZXJDZWxsTGFiZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgICAvLyB1cGRhdGUgc29ydCBvbiBjdXJyZW50IGNvbFxuICAgICAgICBjb2x1bW4uc29ydCA9IHRoYXQuZ2V0TmV4dFNvcnREaXJlY3Rpb24oY29sdW1uLnNvcnQpO1xuXG4gICAgICAgIC8vIHNvcnRlZEF0IHVzZWQgZm9yIGtub3dpbmcgb3JkZXIgb2YgY29scyB3aGVuIG11bHRpLWNvbCBzb3J0XG4gICAgICAgIGlmIChjb2x1bW4uc29ydCkge1xuICAgICAgICAgICAgY29sdW1uLnNvcnRlZEF0ID0gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb2x1bW4uc29ydGVkQXQgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGRvaW5nTXVsdGlTb3J0ID0gIXRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzU3VwcHJlc3NNdWx0aVNvcnQoKSAmJiBlLnNoaWZ0S2V5O1xuXG4gICAgICAgIC8vIGNsZWFyIHNvcnQgb24gYWxsIGNvbHVtbnMgZXhjZXB0IHRoaXMgb25lLCBhbmQgdXBkYXRlIHRoZSBpY29uc1xuICAgICAgICB0aGF0LmNvbHVtbk1vZGVsLmdldEFsbENvbHVtbnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNvbHVtblRvQ2xlYXIpIHtcbiAgICAgICAgICAgIC8vIERvIG5vdCBjbGVhciBpZiBlaXRoZXIgaG9sZGluZyBzaGlmdCwgb3IgaWYgY29sdW1uIGluIHF1ZXN0aW9uIHdhcyBjbGlja2VkXG4gICAgICAgICAgICBpZiAoIShkb2luZ011bHRpU29ydCB8fCBjb2x1bW5Ub0NsZWFyID09PSBjb2x1bW4pKSB7XG4gICAgICAgICAgICAgICAgY29sdW1uVG9DbGVhci5zb3J0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhhdC5hbmd1bGFyR3JpZC5vblNvcnRpbmdDaGFuZ2VkKCk7XG4gICAgfSk7XG59O1xuXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlU29ydEljb25zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb2x1bW5Nb2RlbC5nZXRBbGxDb2x1bW5zKCkuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4pIHtcbiAgICAgICAgLy8gdXBkYXRlIHZpc2liaWxpdHkgb2YgaWNvbnNcbiAgICAgICAgdmFyIHNvcnRBc2NlbmRpbmcgPSBjb2x1bW4uc29ydCA9PT0gY29uc3RhbnRzLkFTQztcbiAgICAgICAgdmFyIHNvcnREZXNjZW5kaW5nID0gY29sdW1uLnNvcnQgPT09IGNvbnN0YW50cy5ERVNDO1xuXG4gICAgICAgIGlmIChjb2x1bW4uZVNvcnRBc2MpIHtcbiAgICAgICAgICAgIHV0aWxzLnNldFZpc2libGUoY29sdW1uLmVTb3J0QXNjLCBzb3J0QXNjZW5kaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sdW1uLmVTb3J0RGVzYykge1xuICAgICAgICAgICAgdXRpbHMuc2V0VmlzaWJsZShjb2x1bW4uZVNvcnREZXNjLCBzb3J0RGVzY2VuZGluZyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbkhlYWRlclJlbmRlcmVyLnByb3RvdHlwZS5ncm91cERyYWdDYWxsYmFja0ZhY3RvcnkgPSBmdW5jdGlvbihjdXJyZW50R3JvdXApIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcztcbiAgICB2YXIgZGlzcGxheWVkQ29sdW1ucyA9IGN1cnJlbnRHcm91cC5kaXNwbGF5ZWRDb2x1bW5zO1xuICAgIHJldHVybiB7XG4gICAgICAgIG9uRHJhZ1N0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JvdXBXaWR0aFN0YXJ0ID0gY3VycmVudEdyb3VwLmFjdHVhbFdpZHRoO1xuICAgICAgICAgICAgdGhpcy5jaGlsZHJlbldpZHRoU3RhcnRzID0gW107XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICBkaXNwbGF5ZWRDb2x1bW5zLmZvckVhY2goZnVuY3Rpb24oY29sRGVmV3JhcHBlcikge1xuICAgICAgICAgICAgICAgIHRoYXQuY2hpbGRyZW5XaWR0aFN0YXJ0cy5wdXNoKGNvbERlZldyYXBwZXIuYWN0dWFsV2lkdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLm1pbldpZHRoID0gZGlzcGxheWVkQ29sdW1ucy5sZW5ndGggKiBjb25zdGFudHMuTUlOX0NPTF9XSURUSDtcbiAgICAgICAgfSxcbiAgICAgICAgb25EcmFnZ2luZzogZnVuY3Rpb24oZHJhZ0NoYW5nZSkge1xuXG4gICAgICAgICAgICB2YXIgbmV3V2lkdGggPSB0aGlzLmdyb3VwV2lkdGhTdGFydCArIGRyYWdDaGFuZ2U7XG4gICAgICAgICAgICBpZiAobmV3V2lkdGggPCB0aGlzLm1pbldpZHRoKSB7XG4gICAgICAgICAgICAgICAgbmV3V2lkdGggPSB0aGlzLm1pbldpZHRoO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBzZXQgdGhlIG5ldyB3aWR0aCB0byB0aGUgZ3JvdXAgaGVhZGVyXG4gICAgICAgICAgICB2YXIgbmV3V2lkdGhQeCA9IG5ld1dpZHRoICsgXCJweFwiO1xuICAgICAgICAgICAgY3VycmVudEdyb3VwLmVIZWFkZXJHcm91cENlbGwuc3R5bGUud2lkdGggPSBuZXdXaWR0aFB4O1xuICAgICAgICAgICAgY3VycmVudEdyb3VwLmFjdHVhbFdpZHRoID0gbmV3V2lkdGg7XG5cbiAgICAgICAgICAgIC8vIGRpc3RyaWJ1dGUgdGhlIG5ldyB3aWR0aCB0byB0aGUgY2hpbGQgaGVhZGVyc1xuICAgICAgICAgICAgdmFyIGNoYW5nZVJhdGlvID0gbmV3V2lkdGggLyB0aGlzLmdyb3VwV2lkdGhTdGFydDtcbiAgICAgICAgICAgIC8vIGtlZXAgdHJhY2sgb2YgcGl4ZWxzIHVzZWQsIGFuZCBsYXN0IGNvbHVtbiBnZXRzIHRoZSByZW1haW5pbmcsXG4gICAgICAgICAgICAvLyB0byBjYXRlciBmb3Igcm91bmRpbmcgZXJyb3JzLCBhbmQgbWluIHdpZHRoIGFkanVzdG1lbnRzXG4gICAgICAgICAgICB2YXIgcGl4ZWxzVG9EaXN0cmlidXRlID0gbmV3V2lkdGg7XG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgICAgICBjdXJyZW50R3JvdXAuZGlzcGxheWVkQ29sdW1ucy5mb3JFYWNoKGZ1bmN0aW9uKGNvbERlZldyYXBwZXIsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgdmFyIG5vdExhc3RDb2wgPSBpbmRleCAhPT0gKGRpc3BsYXllZENvbHVtbnMubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0NoaWxkU2l6ZTtcbiAgICAgICAgICAgICAgICBpZiAobm90TGFzdENvbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBub3QgdGhlIGxhc3QgY29sLCBjYWxjdWxhdGUgdGhlIGNvbHVtbiB3aWR0aCBhcyBub3JtYWxcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0Q2hpbGRTaXplID0gdGhhdC5jaGlsZHJlbldpZHRoU3RhcnRzW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgbmV3Q2hpbGRTaXplID0gc3RhcnRDaGlsZFNpemUgKiBjaGFuZ2VSYXRpbztcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0NoaWxkU2l6ZSA8IGNvbnN0YW50cy5NSU5fQ09MX1dJRFRIKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDaGlsZFNpemUgPSBjb25zdGFudHMuTUlOX0NPTF9XSURUSDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwaXhlbHNUb0Rpc3RyaWJ1dGUgLT0gbmV3Q2hpbGRTaXplO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIGxhc3QgY29sLCBnaXZlIGl0IHRoZSByZW1haW5pbmcgcGl4ZWxzXG4gICAgICAgICAgICAgICAgICAgIG5ld0NoaWxkU2l6ZSA9IHBpeGVsc1RvRGlzdHJpYnV0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGVIZWFkZXJDZWxsID0gZGlzcGxheWVkQ29sdW1uc1tpbmRleF0uZUhlYWRlckNlbGw7XG4gICAgICAgICAgICAgICAgcGFyZW50LmFkanVzdENvbHVtbldpZHRoKG5ld0NoaWxkU2l6ZSwgY29sRGVmV3JhcHBlciwgZUhlYWRlckNlbGwpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIHNob3VsZCBub3QgYmUgY2FsbGluZyB0aGVzZSBoZXJlLCBzaG91bGQgZG8gc29tZXRoaW5nIGVsc2VcbiAgICAgICAgICAgIGlmIChjdXJyZW50R3JvdXAucGlubmVkKSB7XG4gICAgICAgICAgICAgICAgcGFyZW50LmFuZ3VsYXJHcmlkLnVwZGF0ZVBpbm5lZENvbENvbnRhaW5lcldpZHRoQWZ0ZXJDb2xSZXNpemUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyZW50LmFuZ3VsYXJHcmlkLnVwZGF0ZUJvZHlDb250YWluZXJXaWR0aEFmdGVyQ29sUmVzaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmFkanVzdENvbHVtbldpZHRoID0gZnVuY3Rpb24obmV3V2lkdGgsIGNvbHVtbiwgZUhlYWRlckNlbGwpIHtcbiAgICB2YXIgbmV3V2lkdGhQeCA9IG5ld1dpZHRoICsgXCJweFwiO1xuICAgIHZhciBzZWxlY3RvckZvckFsbENvbHNJbkNlbGwgPSBcIi5jZWxsLWNvbC1cIiArIGNvbHVtbi5pbmRleDtcbiAgICB2YXIgY2VsbHNGb3JUaGlzQ29sID0gdGhpcy5lUm9vdC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yRm9yQWxsQ29sc0luQ2VsbCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjZWxsc0ZvclRoaXNDb2wubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY2VsbHNGb3JUaGlzQ29sW2ldLnN0eWxlLndpZHRoID0gbmV3V2lkdGhQeDtcbiAgICB9XG5cbiAgICBlSGVhZGVyQ2VsbC5zdHlsZS53aWR0aCA9IG5ld1dpZHRoUHg7XG4gICAgY29sdW1uLmFjdHVhbFdpZHRoID0gbmV3V2lkdGg7XG59O1xuXG4vLyBnZXRzIGNhbGxlZCB3aGVuIGEgaGVhZGVyIChub3QgYSBoZWFkZXIgZ3JvdXApIGdldHMgcmVzaXplZFxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLmhlYWRlckRyYWdDYWxsYmFja0ZhY3RvcnkgPSBmdW5jdGlvbihoZWFkZXJDZWxsLCBjb2x1bW4sIGhlYWRlckdyb3VwKSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgb25EcmFnU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5zdGFydFdpZHRoID0gY29sdW1uLmFjdHVhbFdpZHRoO1xuICAgICAgICB9LFxuICAgICAgICBvbkRyYWdnaW5nOiBmdW5jdGlvbihkcmFnQ2hhbmdlKSB7XG4gICAgICAgICAgICB2YXIgbmV3V2lkdGggPSB0aGlzLnN0YXJ0V2lkdGggKyBkcmFnQ2hhbmdlO1xuICAgICAgICAgICAgaWYgKG5ld1dpZHRoIDwgY29uc3RhbnRzLk1JTl9DT0xfV0lEVEgpIHtcbiAgICAgICAgICAgICAgICBuZXdXaWR0aCA9IGNvbnN0YW50cy5NSU5fQ09MX1dJRFRIO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwYXJlbnQuYWRqdXN0Q29sdW1uV2lkdGgobmV3V2lkdGgsIGNvbHVtbiwgaGVhZGVyQ2VsbCk7XG5cbiAgICAgICAgICAgIGlmIChoZWFkZXJHcm91cCkge1xuICAgICAgICAgICAgICAgIHBhcmVudC5zZXRXaWR0aE9mR3JvdXBIZWFkZXJDZWxsKGhlYWRlckdyb3VwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gc2hvdWxkIG5vdCBiZSBjYWxsaW5nIHRoZXNlIGhlcmUsIHNob3VsZCBkbyBzb21ldGhpbmcgZWxzZVxuICAgICAgICAgICAgaWYgKGNvbHVtbi5waW5uZWQpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnQuYW5ndWxhckdyaWQudXBkYXRlUGlubmVkQ29sQ29udGFpbmVyV2lkdGhBZnRlckNvbFJlc2l6ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJlbnQuYW5ndWxhckdyaWQudXBkYXRlQm9keUNvbnRhaW5lcldpZHRoQWZ0ZXJDb2xSZXNpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59O1xuXG5IZWFkZXJSZW5kZXJlci5wcm90b3R5cGUuc3RvcERyYWdnaW5nID0gZnVuY3Rpb24obGlzdGVuZXJzVG9SZW1vdmUpIHtcbiAgICB0aGlzLmVSb290LnN0eWxlLmN1cnNvciA9IFwiXCI7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHV0aWxzLml0ZXJhdGVPYmplY3QobGlzdGVuZXJzVG9SZW1vdmUsIGZ1bmN0aW9uKGtleSwgbGlzdGVuZXIpIHtcbiAgICAgICAgdGhhdC5lUm9vdC5yZW1vdmVFdmVudExpc3RlbmVyKGtleSwgbGlzdGVuZXIpO1xuICAgIH0pO1xufTtcblxuSGVhZGVyUmVuZGVyZXIucHJvdG90eXBlLnVwZGF0ZUZpbHRlckljb25zID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheWVkQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgIC8vIHRvZG86IG5lZWQgdG8gY2hhbmdlIHRoaXMsIHNvIG9ubHkgdXBkYXRlcyBpZiBjb2x1bW4gaXMgdmlzaWJsZVxuICAgICAgICBpZiAoY29sdW1uLmVGaWx0ZXJJY29uKSB7XG4gICAgICAgICAgICB2YXIgZmlsdGVyUHJlc2VudCA9IHRoYXQuZmlsdGVyTWFuYWdlci5pc0ZpbHRlclByZXNlbnRGb3JDb2woY29sdW1uLmNvbElkKTtcbiAgICAgICAgICAgIHZhciBkaXNwbGF5U3R5bGUgPSBmaWx0ZXJQcmVzZW50ID8gJ2lubGluZScgOiAnbm9uZSc7XG4gICAgICAgICAgICBjb2x1bW4uZUZpbHRlckljb24uc3R5bGUuZGlzcGxheSA9IGRpc3BsYXlTdHlsZTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIZWFkZXJSZW5kZXJlcjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIEJvcmRlckxheW91dChwYXJhbXMpIHtcblxuICAgIHRoaXMuaXNMYXlvdXRQYW5lbCA9IHRydWU7XG5cbiAgICB0aGlzLmZ1bGxIZWlnaHQgPSAhcGFyYW1zLm5vcnRoICYmICFwYXJhbXMuc291dGg7XG5cbiAgICB2YXIgdGVtcGxhdGU7XG4gICAgaWYgKCFwYXJhbXMuZG9udEZpbGwpIHtcbiAgICAgICAgaWYgKHRoaXMuZnVsbEhlaWdodCkge1xuICAgICAgICAgICAgdGVtcGxhdGUgPVxuICAgICAgICAgICAgICAgICc8ZGl2IHN0eWxlPVwiaGVpZ2h0OiAxMDAlOyBvdmVyZmxvdzogYXV0bzsgcG9zaXRpb246IHJlbGF0aXZlO1wiPicgK1xuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwid2VzdFwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlOyBmbG9hdDogbGVmdDtcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImVhc3RcIiBzdHlsZT1cImhlaWdodDogMTAwJTsgZmxvYXQ6IHJpZ2h0O1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiY2VudGVyXCIgc3R5bGU9XCJoZWlnaHQ6IDEwMCU7XCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJvdmVybGF5XCIgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IHRvcDogMHB4OyBsZWZ0OiAwcHg7XCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzwvZGl2Pic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0ZW1wbGF0ZSA9XG4gICAgICAgICAgICAgICAgJzxkaXYgc3R5bGU9XCJoZWlnaHQ6IDEwMCU7IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cIm5vcnRoXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJjZW50ZXJSb3dcIiBzdHlsZT1cImhlaWdodDogMTAwJTsgb3ZlcmZsb3c6IGhpZGRlbjtcIj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cIndlc3RcIiBzdHlsZT1cImhlaWdodDogMTAwJTsgZmxvYXQ6IGxlZnQ7XCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJlYXN0XCIgc3R5bGU9XCJoZWlnaHQ6IDEwMCU7IGZsb2F0OiByaWdodDtcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImNlbnRlclwiIHN0eWxlPVwiaGVpZ2h0OiAxMDAlO1wiPjwvZGl2PicgK1xuICAgICAgICAgICAgICAgICc8L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cInNvdXRoXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJvdmVybGF5XCIgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7IHRvcDogMHB4OyBsZWZ0OiAwcHg7XCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXlvdXRBY3RpdmUgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRlbXBsYXRlID1cbiAgICAgICAgICAgICc8ZGl2IHN0eWxlPVwicG9zaXRpb246IHJlbGF0aXZlO1wiPicgK1xuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwibm9ydGhcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cImNlbnRlclJvd1wiPicgK1xuICAgICAgICAgICAgICAgICAgICAnPGRpdiBpZD1cIndlc3RcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAgICAgJzxkaXYgaWQ9XCJlYXN0XCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwiY2VudGVyXCI+PC9kaXY+JyArXG4gICAgICAgICAgICAgICAgJzwvZGl2PicgK1xuICAgICAgICAgICAgICAgICc8ZGl2IGlkPVwic291dGhcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cIm92ZXJsYXlcIiBzdHlsZT1cInBvc2l0aW9uOiBhYnNvbHV0ZTsgaGVpZ2h0OiAxMDAlOyB3aWR0aDogMTAwJTsgdG9wOiAwcHg7IGxlZnQ6IDBweDtcIj48L2Rpdj4nICtcbiAgICAgICAgICAgICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLmxheW91dEFjdGl2ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0ZW1wbGF0ZSk7XG5cbiAgICB0aGlzLmlkID0gJ2JvcmRlckxheW91dCc7XG4gICAgaWYgKHBhcmFtcy5uYW1lKSB7XG4gICAgICAgIHRoaXMuaWQgKz0gJ18nICsgcGFyYW1zLm5hbWU7XG4gICAgfVxuICAgIHRoaXMuZUd1aS5zZXRBdHRyaWJ1dGUoJ2lkJywgdGhpcy5pZCk7XG4gICAgdGhpcy5jaGlsZFBhbmVscyA9IFtdO1xuXG4gICAgaWYgKHBhcmFtcykge1xuICAgICAgICB0aGlzLnNldHVwUGFuZWxzKHBhcmFtcyk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRPdmVybGF5VmlzaWJsZShmYWxzZSk7XG59XG5cbkJvcmRlckxheW91dC5wcm90b3R5cGUuc2V0dXBQYW5lbHMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICB0aGlzLmVOb3J0aFdyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI25vcnRoJyk7XG4gICAgdGhpcy5lU291dGhXcmFwcGVyID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNzb3V0aCcpO1xuICAgIHRoaXMuZUVhc3RXcmFwcGVyID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNlYXN0Jyk7XG4gICAgdGhpcy5lV2VzdFdyYXBwZXIgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI3dlc3QnKTtcbiAgICB0aGlzLmVDZW50ZXJXcmFwcGVyID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNjZW50ZXInKTtcbiAgICB0aGlzLmVPdmVybGF5V3JhcHBlciA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjb3ZlcmxheScpO1xuICAgIHRoaXMuZUNlbnRlclJvdyA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjY2VudGVyUm93Jyk7XG5cbiAgICB0aGlzLmVOb3J0aENoaWxkTGF5b3V0ID0gdGhpcy5zZXR1cFBhbmVsKHBhcmFtcy5ub3J0aCwgdGhpcy5lTm9ydGhXcmFwcGVyKTtcbiAgICB0aGlzLmVTb3V0aENoaWxkTGF5b3V0ID0gdGhpcy5zZXR1cFBhbmVsKHBhcmFtcy5zb3V0aCwgdGhpcy5lU291dGhXcmFwcGVyKTtcbiAgICB0aGlzLmVFYXN0Q2hpbGRMYXlvdXQgPSB0aGlzLnNldHVwUGFuZWwocGFyYW1zLmVhc3QsIHRoaXMuZUVhc3RXcmFwcGVyKTtcbiAgICB0aGlzLmVXZXN0Q2hpbGRMYXlvdXQgPSB0aGlzLnNldHVwUGFuZWwocGFyYW1zLndlc3QsIHRoaXMuZVdlc3RXcmFwcGVyKTtcbiAgICB0aGlzLmVDZW50ZXJDaGlsZExheW91dCA9IHRoaXMuc2V0dXBQYW5lbChwYXJhbXMuY2VudGVyLCB0aGlzLmVDZW50ZXJXcmFwcGVyKTtcblxuICAgIHRoaXMuc2V0dXBQYW5lbChwYXJhbXMub3ZlcmxheSwgdGhpcy5lT3ZlcmxheVdyYXBwZXIpO1xufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5zZXR1cFBhbmVsID0gZnVuY3Rpb24oY29udGVudCwgZVBhbmVsKSB7XG4gICAgaWYgKCFlUGFuZWwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoY29udGVudCkge1xuICAgICAgICBpZiAoY29udGVudC5pc0xheW91dFBhbmVsKSB7XG4gICAgICAgICAgICB0aGlzLmNoaWxkUGFuZWxzLnB1c2goY29udGVudCk7XG4gICAgICAgICAgICBlUGFuZWwuYXBwZW5kQ2hpbGQoY29udGVudC5nZXRHdWkoKSk7XG4gICAgICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVQYW5lbC5hcHBlbmRDaGlsZChjb250ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZVBhbmVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZVBhbmVsKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5nZXRHdWkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5lR3VpO1xufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5kb0xheW91dCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5sYXlvdXRDaGlsZCh0aGlzLmVOb3J0aENoaWxkTGF5b3V0KTtcbiAgICB0aGlzLmxheW91dENoaWxkKHRoaXMuZVNvdXRoQ2hpbGRMYXlvdXQpO1xuICAgIHRoaXMubGF5b3V0Q2hpbGQodGhpcy5lRWFzdENoaWxkTGF5b3V0KTtcbiAgICB0aGlzLmxheW91dENoaWxkKHRoaXMuZVdlc3RDaGlsZExheW91dCk7XG5cbiAgICBpZiAodGhpcy5sYXlvdXRBY3RpdmUpIHtcbiAgICAgICAgdGhpcy5sYXlvdXRIZWlnaHQoKTtcbiAgICAgICAgdGhpcy5sYXlvdXRXaWR0aCgpO1xuICAgIH1cblxuICAgIHRoaXMubGF5b3V0Q2hpbGQodGhpcy5lQ2VudGVyQ2hpbGRMYXlvdXQpO1xufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5sYXlvdXRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkUGFuZWwpIHtcbiAgICBpZiAoY2hpbGRQYW5lbCkge1xuICAgICAgICBjaGlsZFBhbmVsLmRvTGF5b3V0KCk7XG4gICAgfVxufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5sYXlvdXRIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5mdWxsSGVpZ2h0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgdG90YWxIZWlnaHQgPSB1dGlscy5vZmZzZXRIZWlnaHQodGhpcy5lR3VpKTtcbiAgICB2YXIgbm9ydGhIZWlnaHQgPSB1dGlscy5vZmZzZXRIZWlnaHQodGhpcy5lTm9ydGhXcmFwcGVyKTtcbiAgICB2YXIgc291dGhIZWlnaHQgPSB1dGlscy5vZmZzZXRIZWlnaHQodGhpcy5lU291dGhXcmFwcGVyKTtcblxuICAgIHZhciBjZW50ZXJIZWlnaHQgPSB0b3RhbEhlaWdodCAtIG5vcnRoSGVpZ2h0IC0gc291dGhIZWlnaHQ7XG4gICAgaWYgKGNlbnRlckhlaWdodCA8IDApIHtcbiAgICAgICAgY2VudGVySGVpZ2h0ID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLmVDZW50ZXJSb3cuc3R5bGUuaGVpZ2h0ID0gY2VudGVySGVpZ2h0ICsgJ3B4Jztcbn07XG5cbkJvcmRlckxheW91dC5wcm90b3R5cGUubGF5b3V0V2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdG90YWxXaWR0aCA9IHV0aWxzLm9mZnNldFdpZHRoKHRoaXMuZUd1aSk7XG4gICAgdmFyIGVhc3RXaWR0aCA9IHV0aWxzLm9mZnNldFdpZHRoKHRoaXMuZUVhc3RXcmFwcGVyKTtcbiAgICB2YXIgd2VzdFdpZHRoID0gdXRpbHMub2Zmc2V0V2lkdGgodGhpcy5lV2VzdFdyYXBwZXIpO1xuXG4gICAgdmFyIGNlbnRlcldpZHRoID0gdG90YWxXaWR0aCAtIGVhc3RXaWR0aCAtIHdlc3RXaWR0aDtcbiAgICBpZiAoY2VudGVyV2lkdGggPCAwKSB7XG4gICAgICAgIGNlbnRlcldpZHRoID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLmVDZW50ZXJXcmFwcGVyLnN0eWxlLndpZHRoID0gY2VudGVyV2lkdGggKyAncHgnO1xufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5zZXRFYXN0VmlzaWJsZSA9IGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodGhpcy5lRWFzdFdyYXBwZXIpIHtcbiAgICAgICAgdGhpcy5lRWFzdFdyYXBwZXIuc3R5bGUuZGlzcGxheSA9IHZpc2libGUgPyAnJyA6ICdub25lJztcbiAgICB9XG4gICAgdGhpcy5kb0xheW91dCgpO1xufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5zZXRPdmVybGF5VmlzaWJsZSA9IGZ1bmN0aW9uKHZpc2libGUpIHtcbiAgICBpZiAodGhpcy5lT3ZlcmxheVdyYXBwZXIpIHtcbiAgICAgICAgdGhpcy5lT3ZlcmxheVdyYXBwZXIuc3R5bGUuZGlzcGxheSA9IHZpc2libGUgPyAnJyA6ICdub25lJztcbiAgICB9XG4gICAgdGhpcy5kb0xheW91dCgpO1xufTtcblxuQm9yZGVyTGF5b3V0LnByb3RvdHlwZS5zZXRTb3V0aFZpc2libGUgPSBmdW5jdGlvbih2aXNpYmxlKSB7XG4gICAgaWYgKHRoaXMuZVNvdXRoV3JhcHBlcikge1xuICAgICAgICB0aGlzLmVTb3V0aFdyYXBwZXIuc3R5bGUuZGlzcGxheSA9IHZpc2libGUgPyAnJyA6ICdub25lJztcbiAgICB9XG4gICAgdGhpcy5kb0xheW91dCgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb3JkZXJMYXlvdXQ7IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gVmVydGljYWxTdGFjaygpIHtcblxuICAgIHRoaXMuaXNMYXlvdXRQYW5lbCA9IHRydWU7XG4gICAgdGhpcy5jaGlsZFBhbmVscyA9IFtdO1xuICAgIHRoaXMuZUd1aSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuZUd1aS5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XG59XG5cblZlcnRpY2FsU3RhY2sucHJvdG90eXBlLmFkZFBhbmVsID0gZnVuY3Rpb24ocGFuZWwsIGhlaWdodCkge1xuICAgIHZhciBjb21wb25lbnQ7XG4gICAgaWYgKHBhbmVsLmlzTGF5b3V0UGFuZWwpIHtcbiAgICAgICAgdGhpcy5jaGlsZFBhbmVscy5wdXNoKHBhbmVsKTtcbiAgICAgICAgY29tcG9uZW50ID0gcGFuZWwuZ2V0R3VpKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29tcG9uZW50ID0gcGFuZWw7XG4gICAgfVxuXG4gICAgaWYgKGhlaWdodCkge1xuICAgICAgICBjb21wb25lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIH1cbiAgICB0aGlzLmVHdWkuYXBwZW5kQ2hpbGQoY29tcG9uZW50KTtcbn07XG5cblZlcnRpY2FsU3RhY2sucHJvdG90eXBlLmdldEd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmVHdWk7XG59O1xuXG5WZXJ0aWNhbFN0YWNrLnByb3RvdHlwZS5kb0xheW91dCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpPHRoaXMuY2hpbGRQYW5lbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5jaGlsZFBhbmVsc1tpXS5kb0xheW91dCgpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmVydGljYWxTdGFjazsiLCJ2YXIgZ3JvdXBDcmVhdG9yID0gcmVxdWlyZSgnLi8uLi9ncm91cENyZWF0b3InKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCcuLy4uL2NvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBJbk1lbW9yeVJvd0NvbnRyb2xsZXIoKSB7XG4gICAgdGhpcy5jcmVhdGVNb2RlbCgpO1xufVxuXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbk1vZGVsLCBhbmd1bGFyR3JpZCwgZmlsdGVyTWFuYWdlciwgJHNjb3BlLCBleHByZXNzaW9uU2VydmljZSkge1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xuICAgIHRoaXMuY29sdW1uTW9kZWwgPSBjb2x1bW5Nb2RlbDtcbiAgICB0aGlzLmFuZ3VsYXJHcmlkID0gYW5ndWxhckdyaWQ7XG4gICAgdGhpcy5maWx0ZXJNYW5hZ2VyID0gZmlsdGVyTWFuYWdlcjtcbiAgICB0aGlzLiRzY29wZSA9ICRzY29wZTtcbiAgICB0aGlzLmV4cHJlc3Npb25TZXJ2aWNlID0gZXhwcmVzc2lvblNlcnZpY2U7XG5cbiAgICB0aGlzLmFsbFJvd3MgPSBudWxsO1xuICAgIHRoaXMucm93c0FmdGVyR3JvdXAgPSBudWxsO1xuICAgIHRoaXMucm93c0FmdGVyRmlsdGVyID0gbnVsbDtcbiAgICB0aGlzLnJvd3NBZnRlclNvcnQgPSBudWxsO1xuICAgIHRoaXMucm93c0FmdGVyTWFwID0gbnVsbDtcbn07XG5cbi8vIHByaXZhdGVcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuY3JlYXRlTW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5tb2RlbCA9IHtcbiAgICAgICAgLy8gdGhpcyBtZXRob2QgaXMgaW1wbGVtZW50ZWQgYnkgdGhlIGluTWVtb3J5IG1vZGVsIG9ubHksXG4gICAgICAgIC8vIGl0IGdpdmVzIHRoZSB0b3AgbGV2ZWwgb2YgdGhlIHNlbGVjdGlvbi4gdXNlZCBieSB0aGUgc2VsZWN0aW9uXG4gICAgICAgIC8vIGNvbnRyb2xsZXIsIHdoZW4gaXQgbmVlZHMgdG8gZG8gYSBmdWxsIHRyYXZlcnNhbFxuICAgICAgICBnZXRUb3BMZXZlbE5vZGVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnJvd3NBZnRlckdyb3VwO1xuICAgICAgICB9LFxuICAgICAgICBnZXRWaXJ0dWFsUm93OiBmdW5jdGlvbihpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoYXQucm93c0FmdGVyTWFwW2luZGV4XTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VmlydHVhbFJvd0NvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGF0LnJvd3NBZnRlck1hcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGF0LnJvd3NBZnRlck1hcC5sZW5ndGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmb3JFYWNoSW5NZW1vcnk6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGF0LmZvckVhY2hJbk1lbW9yeShjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxuLy8gcHVibGljXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubW9kZWw7XG59O1xuXG4vLyBwdWJsaWNcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZm9yRWFjaEluTWVtb3J5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIC8vIGl0ZXJhdGVzIHRocm91Z2ggZWFjaCBpdGVtIGluIG1lbW9yeSwgYW5kIGNhbGxzIHRoZSBjYWxsYmFjayBmdW5jdGlvblxuICAgIGZ1bmN0aW9uIGRvQ2FsbGJhY2sobGlzdCwgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGxpc3QpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpPGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGxpc3RbaV07XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soaXRlbSk7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0uZ3JvdXAgJiYgZ3JvdXAuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZG9DYWxsYmFjayhncm91cC5jaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZG9DYWxsYmFjayh0aGlzLnJvd3NBZnRlckdyb3VwLCBjYWxsYmFjayk7XG59O1xuXG4vLyBwdWJsaWNcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlTW9kZWwgPSBmdW5jdGlvbihzdGVwKSB7XG5cbiAgICAvLyBmYWxsdGhyb3VnaCBpbiBiZWxvdyBzd2l0Y2ggaXMgb24gcHVycG9zZVxuICAgIHN3aXRjaCAoc3RlcCkge1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEVQX0VWRVJZVEhJTkc6XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLlNURVBfRklMVEVSOlxuICAgICAgICAgICAgdGhpcy5kb0ZpbHRlcigpO1xuICAgICAgICAgICAgdGhpcy5kb0FnZ3JlZ2F0ZSgpO1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEVQX1NPUlQ6XG4gICAgICAgICAgICB0aGlzLmRvU29ydCgpO1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5TVEVQX01BUDpcbiAgICAgICAgICAgIHRoaXMuZG9Hcm91cE1hcHBpbmcoKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldE1vZGVsVXBkYXRlZCgpID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldE1vZGVsVXBkYXRlZCgpKCk7XG4gICAgICAgIHZhciAkc2NvcGUgPSB0aGlzLiRzY29wZTtcbiAgICAgICAgaWYgKCRzY29wZSkge1xuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kZWZhdWx0R3JvdXBBZ2dGdW5jdGlvbkZhY3RvcnkgPSBmdW5jdGlvbihncm91cEFnZ0ZpZWxkcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBncm91cEFnZ0Z1bmN0aW9uKHJvd3MpIHtcblxuICAgICAgICB2YXIgc3VtcyA9IHt9O1xuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqPGdyb3VwQWdnRmllbGRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgY29sS2V5ID0gZ3JvdXBBZ2dGaWVsZHNbal07XG4gICAgICAgICAgICB2YXIgdG90YWxGb3JDb2x1bW4gPSBudWxsO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8cm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciByb3cgPSByb3dzW2ldO1xuICAgICAgICAgICAgICAgIHZhciB0aGlzQ29sdW1uVmFsdWUgPSByb3cuZGF0YVtjb2xLZXldO1xuICAgICAgICAgICAgICAgIC8vIG9ubHkgaW5jbHVkZSBpZiB0aGUgdmFsdWUgaXMgYSBudW1iZXJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXNDb2x1bW5WYWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxGb3JDb2x1bW4gKz0gdGhpc0NvbHVtblZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGF0IHRoaXMgcG9pbnQsIGlmIG5vIHZhbHVlcyB3ZXJlIG51bWJlcnMsIHRoZSByZXN1bHQgaXMgbnVsbCAobm90IHplcm8pXG4gICAgICAgICAgICBzdW1zW2NvbEtleV0gPSB0b3RhbEZvckNvbHVtbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzdW1zO1xuXG4gICAgfTtcbn07XG5cbi8vIHByaXZhdGVcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbihkYXRhLCBjb2xEZWYsIG5vZGUsIHJvd0luZGV4KSB7XG4gICAgdmFyIGFwaSA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpO1xuICAgIHZhciBjb250ZXh0ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpO1xuICAgIHJldHVybiB1dGlscy5nZXRWYWx1ZSh0aGlzLmV4cHJlc3Npb25TZXJ2aWNlLCBkYXRhLCBjb2xEZWYsIG5vZGUsIHJvd0luZGV4LCBhcGksIGNvbnRleHQpO1xufTtcblxuLy8gcHVibGljIC0gaXQncyBwb3NzaWJsZSB0byByZWNvbXB1dGUgdGhlIGFnZ3JlZ2F0ZSB3aXRob3V0IGRvaW5nIHRoZSBvdGhlciBwYXJ0c1xuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb0FnZ3JlZ2F0ZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGdyb3VwQWdnRnVuY3Rpb24gPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRHcm91cEFnZ0Z1bmN0aW9uKCk7XG4gICAgaWYgKHR5cGVvZiBncm91cEFnZ0Z1bmN0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlDcmVhdGVBZ2dEYXRhKHRoaXMucm93c0FmdGVyRmlsdGVyLCBncm91cEFnZ0Z1bmN0aW9uKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBncm91cEFnZ0ZpZWxkcyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEdyb3VwQWdnRmllbGRzKCk7XG4gICAgaWYgKGdyb3VwQWdnRmllbGRzKSB7XG4gICAgICAgIHZhciBkZWZhdWx0QWdnRnVuY3Rpb24gPSB0aGlzLmRlZmF1bHRHcm91cEFnZ0Z1bmN0aW9uRmFjdG9yeShncm91cEFnZ0ZpZWxkcyk7XG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlDcmVhdGVBZ2dEYXRhKHRoaXMucm93c0FmdGVyRmlsdGVyLCBkZWZhdWx0QWdnRnVuY3Rpb24pO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG59O1xuXG4vLyBwdWJsaWNcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZXhwYW5kT3JDb2xsYXBzZUFsbCA9IGZ1bmN0aW9uKGV4cGFuZCwgcm93Tm9kZXMpIHtcbiAgICAvLyBpZiBmaXJzdCBjYWxsIGluIHJlY3Vyc2lvbiwgd2Ugc2V0IGxpc3QgdG8gcGFyZW50IGxpc3RcbiAgICBpZiAocm93Tm9kZXMgPT09IG51bGwpIHtcbiAgICAgICAgcm93Tm9kZXMgPSB0aGlzLnJvd3NBZnRlckdyb3VwO1xuICAgIH1cblxuICAgIGlmICghcm93Tm9kZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgcm93Tm9kZXMuZm9yRWFjaChmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgICAgICBub2RlLmV4cGFuZGVkID0gZXhwYW5kO1xuICAgICAgICAgICAgX3RoaXMuZXhwYW5kT3JDb2xsYXBzZUFsbChleHBhbmQsIG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vLyBwcml2YXRlXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnJlY3Vyc2l2ZWx5Q3JlYXRlQWdnRGF0YSA9IGZ1bmN0aW9uKG5vZGVzLCBncm91cEFnZ0Z1bmN0aW9uKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXApIHtcbiAgICAgICAgICAgIC8vIGFnZyBmdW5jdGlvbiBuZWVkcyB0byBzdGFydCBhdCB0aGUgYm90dG9tLCBzbyB0cmF2ZXJzZSBmaXJzdFxuICAgICAgICAgICAgdGhpcy5yZWN1cnNpdmVseUNyZWF0ZUFnZ0RhdGEobm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyLCBncm91cEFnZ0Z1bmN0aW9uKTtcbiAgICAgICAgICAgIC8vIGFmdGVyIHRyYXZlcnNhbCwgd2UgY2FuIG5vdyBkbyB0aGUgYWdnIGF0IHRoaXMgbGV2ZWxcbiAgICAgICAgICAgIHZhciBkYXRhID0gZ3JvdXBBZ2dGdW5jdGlvbihub2RlLmNoaWxkcmVuQWZ0ZXJGaWx0ZXIpO1xuICAgICAgICAgICAgbm9kZS5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIC8vIGlmIHdlIGFyZSBncm91cGluZywgdGhlbiBpdCdzIHBvc3NpYmxlIHRoZXJlIGlzIGEgc2libGluZyBmb290ZXJcbiAgICAgICAgICAgIC8vIHRvIHRoZSBncm91cCwgc28gdXBkYXRlIHRoZSBkYXRhIGhlcmUgYWxzbyBpZiB0aGVyZSBpcyBvbmVcbiAgICAgICAgICAgIGlmIChub2RlLnNpYmxpbmcpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNpYmxpbmcuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBwcml2YXRlXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmRvU29ydCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzb3J0aW5nO1xuXG4gICAgLy8gaWYgdGhlIHNvcnRpbmcgaXMgYWxyZWFkeSBkb25lIGJ5IHRoZSBzZXJ2ZXIsIHRoZW4gd2Ugc2hvdWxkIG5vdCBkbyBpdCBoZXJlXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcoKSkge1xuICAgICAgICBzb3J0aW5nID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy9zZWUgaWYgdGhlcmUgaXMgYSBjb2wgd2UgYXJlIHNvcnRpbmcgYnlcbiAgICAgICAgdmFyIHNvcnRpbmdPcHRpb25zID0gW107XG4gICAgICAgIHRoaXMuY29sdW1uTW9kZWwuZ2V0QWxsQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICAgICAgICBpZiAoY29sdW1uLnNvcnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXNjZW5kaW5nID0gY29sdW1uLnNvcnQgPT09IGNvbnN0YW50cy5BU0M7XG4gICAgICAgICAgICAgICAgc29ydGluZ09wdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGludmVydGVyOiBhc2NlbmRpbmcgPyAxIDogLTEsXG4gICAgICAgICAgICAgICAgICAgIHNvcnRlZEF0OiBjb2x1bW4uc29ydGVkQXQsXG4gICAgICAgICAgICAgICAgICAgIGNvbERlZjogY29sdW1uLmNvbERlZlxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHNvcnRpbmdPcHRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHNvcnRpbmcgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJvd05vZGVzUmVhZHlGb3JTb3J0aW5nID0gdGhpcy5yb3dzQWZ0ZXJGaWx0ZXIgPyB0aGlzLnJvd3NBZnRlckZpbHRlci5zbGljZSgwKSA6IG51bGw7XG5cbiAgICBpZiAoc29ydGluZykge1xuICAgICAgICAvLyBUaGUgY29sdW1ucyBhcmUgdG8gYmUgc29ydGVkIGluIHRoZSBvcmRlciB0aGF0IHRoZSB1c2VyIHNlbGVjdGVkIHRoZW06XG4gICAgICAgIHNvcnRpbmdPcHRpb25zLnNvcnQoZnVuY3Rpb24ob3B0aW9uQSwgb3B0aW9uQil7XG4gICAgICAgICAgICByZXR1cm4gb3B0aW9uQS5zb3J0ZWRBdCAtIG9wdGlvbkIuc29ydGVkQXQ7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNvcnRMaXN0KHJvd05vZGVzUmVhZHlGb3JTb3J0aW5nLCBzb3J0aW5nT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gaWYgbm8gc29ydGluZywgc2V0IGFsbCBncm91cCBjaGlsZHJlbiBhZnRlciBzb3J0IHRvIHRoZSBvcmlnaW5hbCBsaXN0LlxuICAgICAgICAvLyBub3RlOiBpdCBpcyBpbXBvcnRhbnQgdG8gZG8gdGhpcywgZXZlbiBpZiBkb2luZyBzZXJ2ZXIgc2lkZSBzb3J0aW5nLFxuICAgICAgICAvLyB0byBhbGxvdyB0aGUgcm93cyB0byBwYXNzIHRvIHRoZSBuZXh0IHN0YWdlIChpZSBzZXQgdGhlIG5vZGUgdmFsdWVcbiAgICAgICAgLy8gY2hpbGRyZW5BZnRlclNvcnQpXG4gICAgICAgIHRoaXMucmVjdXJzaXZlbHlSZXNldFNvcnQocm93Tm9kZXNSZWFkeUZvclNvcnRpbmcpO1xuICAgIH1cblxuICAgIHRoaXMucm93c0FmdGVyU29ydCA9IHJvd05vZGVzUmVhZHlGb3JTb3J0aW5nO1xufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseVJlc2V0U29ydCA9IGZ1bmN0aW9uKHJvd05vZGVzKSB7XG4gICAgaWYgKCFyb3dOb2Rlcykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gcm93Tm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBpdGVtID0gcm93Tm9kZXNbaV07XG4gICAgICAgIGlmIChpdGVtLmdyb3VwICYmIGl0ZW0uY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGl0ZW0uY2hpbGRyZW5BZnRlclNvcnQgPSBpdGVtLmNoaWxkcmVuQWZ0ZXJGaWx0ZXI7XG4gICAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5UmVzZXRTb3J0KGl0ZW0uY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5zb3J0TGlzdCA9IGZ1bmN0aW9uKG5vZGVzLCBzb3J0T3B0aW9ucykge1xuXG4gICAgLy8gc29ydCBhbnkgZ3JvdXBzIHJlY3Vyc2l2ZWx5XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHsgLy8gY3JpdGljYWwgc2VjdGlvbiwgbm8gZnVuY3Rpb25hbCBwcm9ncmFtbWluZ1xuICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICBpZiAobm9kZS5ncm91cCAmJiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBub2RlLmNoaWxkcmVuQWZ0ZXJTb3J0ID0gbm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyLnNsaWNlKDApO1xuICAgICAgICAgICAgdGhpcy5zb3J0TGlzdChub2RlLmNoaWxkcmVuQWZ0ZXJTb3J0LCBzb3J0T3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgZnVuY3Rpb24gY29tcGFyZShvYmpBLCBvYmpCLCBjb2xEZWYpe1xuICAgICAgICB2YXIgdmFsdWVBID0gdGhhdC5nZXRWYWx1ZShvYmpBLmRhdGEsIGNvbERlZiwgb2JqQSk7XG4gICAgICAgIHZhciB2YWx1ZUIgPSB0aGF0LmdldFZhbHVlKG9iakIuZGF0YSwgY29sRGVmLCBvYmpCKTtcbiAgICAgICAgaWYgKGNvbERlZi5jb21wYXJhdG9yKSB7XG4gICAgICAgICAgICAvL2lmIGNvbXBhcmF0b3IgcHJvdmlkZWQsIHVzZSBpdFxuICAgICAgICAgICAgcmV0dXJuIGNvbERlZi5jb21wYXJhdG9yKHZhbHVlQSwgdmFsdWVCLCBvYmpBLCBvYmpCKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vb3RoZXJ3aXNlIGRvIG91ciBvd24gY29tcGFyaXNvblxuICAgICAgICAgICAgcmV0dXJuIHV0aWxzLmRlZmF1bHRDb21wYXJhdG9yKHZhbHVlQSwgdmFsdWVCLCBvYmpBLCBvYmpCKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5vZGVzLnNvcnQoZnVuY3Rpb24ob2JqQSwgb2JqQikge1xuICAgICAgICAvLyBJdGVyYXRlIGNvbHVtbnMsIHJldHVybiB0aGUgZmlyc3QgdGhhdCBkb2Vzbid0IG1hdGNoXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBzb3J0T3B0aW9ucy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIHNvcnRPcHRpb24gPSBzb3J0T3B0aW9uc1tpXTtcbiAgICAgICAgICAgIHZhciBjb21wYXJlZCA9IGNvbXBhcmUob2JqQSwgb2JqQiwgc29ydE9wdGlvbi5jb2xEZWYpO1xuICAgICAgICAgICAgaWYgKGNvbXBhcmVkICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBhcmVkICogc29ydE9wdGlvbi5pbnZlcnRlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBBbGwgbWF0Y2hlZCwgdGhlc2UgYXJlIGlkZW50aWNhbCBhcyBmYXIgYXMgdGhlIHNvcnQgaXMgY29uY2VybmVkOlxuICAgICAgICByZXR1cm4gMDtcbiAgICB9KTtcbn07XG5cbi8vIHByaXZhdGVcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZG9Hcm91cGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByb3dzQWZ0ZXJHcm91cDtcbiAgICB2YXIgZ3JvdXBlZENvbHMgPSB0aGlzLmNvbHVtbk1vZGVsLmdldEdyb3VwZWRDb2x1bW5zKCk7XG4gICAgdmFyIHJvd3NBbHJlYWR5R3JvdXBlZCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93c0FscmVhZHlHcm91cGVkKCk7XG5cbiAgICB2YXIgZG9pbmdHcm91cGluZyA9ICFyb3dzQWxyZWFkeUdyb3VwZWQgJiYgZ3JvdXBlZENvbHMubGVuZ3RoID4gMDtcblxuICAgIGlmIChkb2luZ0dyb3VwaW5nKSB7XG4gICAgICAgIHZhciBleHBhbmRCeURlZmF1bHQgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRHcm91cERlZmF1bHRFeHBhbmRlZCgpO1xuICAgICAgICByb3dzQWZ0ZXJHcm91cCA9IGdyb3VwQ3JlYXRvci5ncm91cCh0aGlzLmFsbFJvd3MsIGdyb3VwZWRDb2xzLFxuICAgICAgICAgICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0R3JvdXBBZ2dGdW5jdGlvbigpLCBleHBhbmRCeURlZmF1bHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJvd3NBZnRlckdyb3VwID0gdGhpcy5hbGxSb3dzO1xuICAgIH1cbiAgICB0aGlzLnJvd3NBZnRlckdyb3VwID0gcm93c0FmdGVyR3JvdXA7XG59O1xuXG4vLyBwcml2YXRlXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmRvRmlsdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRvaW5nRmlsdGVyO1xuXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZUZpbHRlcigpKSB7XG4gICAgICAgIGRvaW5nRmlsdGVyID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHF1aWNrRmlsdGVyUHJlc2VudCA9IHRoaXMuYW5ndWxhckdyaWQuZ2V0UXVpY2tGaWx0ZXIoKSAhPT0gbnVsbDtcbiAgICAgICAgdmFyIGFkdmFuY2VkRmlsdGVyUHJlc2VudCA9IHRoaXMuZmlsdGVyTWFuYWdlci5pc0ZpbHRlclByZXNlbnQoKTtcbiAgICAgICAgZG9pbmdGaWx0ZXIgPSBxdWlja0ZpbHRlclByZXNlbnQgfHwgYWR2YW5jZWRGaWx0ZXJQcmVzZW50O1xuICAgIH1cblxuICAgIHZhciByb3dzQWZ0ZXJGaWx0ZXI7XG4gICAgaWYgKGRvaW5nRmlsdGVyKSB7XG4gICAgICAgIHJvd3NBZnRlckZpbHRlciA9IHRoaXMuZmlsdGVySXRlbXModGhpcy5yb3dzQWZ0ZXJHcm91cCwgcXVpY2tGaWx0ZXJQcmVzZW50LCBhZHZhbmNlZEZpbHRlclByZXNlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGRvIGl0IGhlcmVcbiAgICAgICAgcm93c0FmdGVyRmlsdGVyID0gdGhpcy5yb3dzQWZ0ZXJHcm91cDtcbiAgICAgICAgdGhpcy5yZWN1cnNpdmVseVJlc2V0RmlsdGVyKHRoaXMucm93c0FmdGVyR3JvdXApO1xuICAgIH1cbiAgICB0aGlzLnJvd3NBZnRlckZpbHRlciA9IHJvd3NBZnRlckZpbHRlcjtcbn07XG5cbi8vIHByaXZhdGVcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZmlsdGVySXRlbXMgPSBmdW5jdGlvbihyb3dOb2RlcywgcXVpY2tGaWx0ZXJQcmVzZW50LCBhZHZhbmNlZEZpbHRlclByZXNlbnQpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHJvd05vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgbm9kZSA9IHJvd05vZGVzW2ldO1xuXG4gICAgICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgICAgICAvLyBkZWFsIHdpdGggZ3JvdXBcbiAgICAgICAgICAgIG5vZGUuY2hpbGRyZW5BZnRlckZpbHRlciA9IHRoaXMuZmlsdGVySXRlbXMobm9kZS5jaGlsZHJlbiwgcXVpY2tGaWx0ZXJQcmVzZW50LCBhZHZhbmNlZEZpbHRlclByZXNlbnQpO1xuICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW5BZnRlckZpbHRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5hbGxDaGlsZHJlbkNvdW50ID0gdGhpcy5nZXRUb3RhbENoaWxkQ291bnQobm9kZS5jaGlsZHJlbkFmdGVyRmlsdGVyKTtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChub2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmRvZXNSb3dQYXNzRmlsdGVyKG5vZGUsIHF1aWNrRmlsdGVyUHJlc2VudCwgYWR2YW5jZWRGaWx0ZXJQcmVzZW50KSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIHByaXZhdGVcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUucmVjdXJzaXZlbHlSZXNldEZpbHRlciA9IGZ1bmN0aW9uKG5vZGVzKSB7XG4gICAgaWYgKCFub2Rlcykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbm9kZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlID0gbm9kZXNbaV07XG4gICAgICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIG5vZGUuY2hpbGRyZW5BZnRlckZpbHRlciA9IG5vZGUuY2hpbGRyZW47XG4gICAgICAgICAgICBub2RlLmFsbENoaWxkcmVuQ291bnQgPSB0aGlzLmdldFRvdGFsQ2hpbGRDb3VudChub2RlLmNoaWxkcmVuQWZ0ZXJGaWx0ZXIpO1xuICAgICAgICAgICAgdGhpcy5yZWN1cnNpdmVseVJlc2V0RmlsdGVyKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuLy8gcm93czogdGhlIHJvd3MgdG8gcHV0IGludG8gdGhlIG1vZGVsXG4vLyBmaXJzdElkOiB0aGUgZmlyc3QgaWQgdG8gdXNlLCB1c2VkIGZvciBwYWdpbmcsIHdoZXJlIHdlIGFyZSBub3Qgb24gdGhlIGZpcnN0IHBhZ2VcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuc2V0QWxsUm93cyA9IGZ1bmN0aW9uKHJvd3MsIGZpcnN0SWQpIHtcbiAgICB2YXIgbm9kZXM7XG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93c0FscmVhZHlHcm91cGVkKCkpIHtcbiAgICAgICAgbm9kZXMgPSByb3dzO1xuICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5Q2hlY2tVc2VyUHJvdmlkZWROb2Rlcyhub2RlcywgbnVsbCwgMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gcGxhY2UgZWFjaCByb3cgaW50byBhIHdyYXBwZXJcbiAgICAgICAgdmFyIG5vZGVzID0gW107XG4gICAgICAgIGlmIChyb3dzKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvd3MubGVuZ3RoOyBpKyspIHsgLy8gY291bGQgYmUgbG90cyBvZiByb3dzLCBkb24ndCB1c2UgZnVuY3Rpb25hbCBwcm9ncmFtbWluZ1xuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiByb3dzW2ldXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiBmaXJzdElkIHByb3ZpZGVkLCB1c2UgaXQsIG90aGVyd2lzZSBzdGFydCBhdCAwXG4gICAgdmFyIGZpcnN0SWRUb1VzZSA9IGZpcnN0SWQgPyBmaXJzdElkIDogMDtcbiAgICB0aGlzLnJlY3Vyc2l2ZWx5QWRkSWRUb05vZGVzKG5vZGVzLCBmaXJzdElkVG9Vc2UpO1xuICAgIHRoaXMuYWxsUm93cyA9IG5vZGVzO1xuXG4gICAgLy8gYWdncmVnYXRlIGhlcmUsIHNvIGZpbHRlcnMgaGF2ZSB0aGUgYWdnIGRhdGEgcmVhZHlcbiAgICB0aGlzLmRvR3JvdXBpbmcoKTtcbn07XG5cbi8vIGFkZCBpbiBpbmRleCAtIHRoaXMgaXMgdXNlZCBieSB0aGUgc2VsZWN0aW9uQ29udHJvbGxlciAtIHNvIHF1aWNrXG4vLyB0byBsb29rIHVwIHNlbGVjdGVkIHJvd3NcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUucmVjdXJzaXZlbHlBZGRJZFRvTm9kZXMgPSBmdW5jdGlvbihub2RlcywgaW5kZXgpIHtcbiAgICBpZiAoIW5vZGVzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICBub2RlLmlkID0gaW5kZXgrKztcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXAgJiYgbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgaW5kZXggPSB0aGlzLnJlY3Vyc2l2ZWx5QWRkSWRUb05vZGVzKG5vZGUuY2hpbGRyZW4sIGluZGV4KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaW5kZXg7XG59O1xuXG4vLyBhZGQgaW4gaW5kZXggLSB0aGlzIGlzIHVzZWQgYnkgdGhlIHNlbGVjdGlvbkNvbnRyb2xsZXIgLSBzbyBxdWlja1xuLy8gdG8gbG9vayB1cCBzZWxlY3RlZCByb3dzXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnJlY3Vyc2l2ZWx5Q2hlY2tVc2VyUHJvdmlkZWROb2RlcyA9IGZ1bmN0aW9uKG5vZGVzLCBwYXJlbnQsIGxldmVsKSB7XG4gICAgaWYgKCFub2Rlcykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgbm9kZS5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZS5sZXZlbCA9IGxldmVsO1xuICAgICAgICBpZiAobm9kZS5ncm91cCAmJiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5Q2hlY2tVc2VyUHJvdmlkZWROb2Rlcyhub2RlLmNoaWxkcmVuLCBub2RlLCBsZXZlbCArIDEpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5nZXRUb3RhbENoaWxkQ291bnQgPSBmdW5jdGlvbihyb3dOb2Rlcykge1xuICAgIHZhciBjb3VudCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSByb3dOb2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGl0ZW0gPSByb3dOb2Rlc1tpXTtcbiAgICAgICAgaWYgKGl0ZW0uZ3JvdXApIHtcbiAgICAgICAgICAgIGNvdW50ICs9IGl0ZW0uYWxsQ2hpbGRyZW5Db3VudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvdW50O1xufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5jb3B5R3JvdXBOb2RlID0gZnVuY3Rpb24oZ3JvdXBOb2RlLCBjaGlsZHJlbiwgYWxsQ2hpbGRyZW5Db3VudCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGdyb3VwOiB0cnVlLFxuICAgICAgICBkYXRhOiBncm91cE5vZGUuZGF0YSxcbiAgICAgICAgZmllbGQ6IGdyb3VwTm9kZS5maWVsZCxcbiAgICAgICAga2V5OiBncm91cE5vZGUua2V5LFxuICAgICAgICBleHBhbmRlZDogZ3JvdXBOb2RlLmV4cGFuZGVkLFxuICAgICAgICBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgIGFsbENoaWxkcmVuQ291bnQ6IGFsbENoaWxkcmVuQ291bnQsXG4gICAgICAgIGxldmVsOiBncm91cE5vZGUubGV2ZWxcbiAgICB9O1xufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb0dyb3VwTWFwcGluZyA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGV2ZW4gaWYgbm90IGdvaW5nIGdyb3VwaW5nLCB3ZSBkbyB0aGUgbWFwcGluZywgYXMgdGhlIGNsaWVudCBtaWdodFxuICAgIC8vIG9mIHBhc3NlZCBpbiBkYXRhIHRoYXQgYWxyZWFkeSBoYXMgYSBncm91cGluZyBpbiBpdCBzb21ld2hlcmVcbiAgICB2YXIgcm93c0FmdGVyTWFwID0gW107XG4gICAgdGhpcy5hZGRUb01hcChyb3dzQWZ0ZXJNYXAsIHRoaXMucm93c0FmdGVyU29ydCk7XG4gICAgdGhpcy5yb3dzQWZ0ZXJNYXAgPSByb3dzQWZ0ZXJNYXA7XG59O1xuXG4vLyBwcml2YXRlXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmFkZFRvTWFwID0gZnVuY3Rpb24obWFwcGVkRGF0YSwgb3JpZ2luYWxOb2Rlcykge1xuICAgIGlmICghb3JpZ2luYWxOb2Rlcykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3JpZ2luYWxOb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbm9kZSA9IG9yaWdpbmFsTm9kZXNbaV07XG4gICAgICAgIG1hcHBlZERhdGEucHVzaChub2RlKTtcbiAgICAgICAgaWYgKG5vZGUuZ3JvdXAgJiYgbm9kZS5leHBhbmRlZCkge1xuICAgICAgICAgICAgdGhpcy5hZGRUb01hcChtYXBwZWREYXRhLCBub2RlLmNoaWxkcmVuQWZ0ZXJTb3J0KTtcblxuICAgICAgICAgICAgLy8gcHV0IGEgZm9vdGVyIGluIGlmIHVzZXIgaXMgbG9va2luZyBmb3IgaXRcbiAgICAgICAgICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwSW5jbHVkZUZvb3RlcigpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvb3Rlck5vZGUgPSB0aGlzLmNyZWF0ZUZvb3Rlck5vZGUobm9kZSk7XG4gICAgICAgICAgICAgICAgbWFwcGVkRGF0YS5wdXNoKGZvb3Rlck5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gcHJpdmF0ZVxuSW5NZW1vcnlSb3dDb250cm9sbGVyLnByb3RvdHlwZS5jcmVhdGVGb290ZXJOb2RlID0gZnVuY3Rpb24oZ3JvdXBOb2RlKSB7XG4gICAgdmFyIGZvb3Rlck5vZGUgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhncm91cE5vZGUpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGZvb3Rlck5vZGVba2V5XSA9IGdyb3VwTm9kZVtrZXldO1xuICAgIH0pO1xuICAgIGZvb3Rlck5vZGUuZm9vdGVyID0gdHJ1ZTtcbiAgICAvLyBnZXQgYm90aCBoZWFkZXIgYW5kIGZvb3RlciB0byByZWZlcmVuY2UgZWFjaCBvdGhlciBhcyBzaWJsaW5ncy4gdGhpcyBpcyBuZXZlciB1bmRvbmUsXG4gICAgLy8gb25seSBvdmVyd3JpdHRlbi4gc28gaWYgYSBncm91cCBpcyBleHBhbmRlZCwgdGhlbiBjb250cmFjdGVkLCBpdCB3aWxsIGhhdmUgYSBnaG9zdFxuICAgIC8vIHNpYmxpbmcgLSBidXQgdGhhdCdzIGZpbmUsIGFzIHdlIGNhbiBpZ25vcmUgdGhpcyBpZiB0aGUgaGVhZGVyIGlzIGNvbnRyYWN0ZWQuXG4gICAgZm9vdGVyTm9kZS5zaWJsaW5nID0gZ3JvdXBOb2RlO1xuICAgIGdyb3VwTm9kZS5zaWJsaW5nID0gZm9vdGVyTm9kZTtcbiAgICByZXR1cm4gZm9vdGVyTm9kZTtcbn07XG5cbi8vIHByaXZhdGVcbkluTWVtb3J5Um93Q29udHJvbGxlci5wcm90b3R5cGUuZG9lc1Jvd1Bhc3NGaWx0ZXIgPSBmdW5jdGlvbihub2RlLCBxdWlja0ZpbHRlclByZXNlbnQsIGFkdmFuY2VkRmlsdGVyUHJlc2VudCkge1xuICAgIC8vZmlyc3QgdXAsIGNoZWNrIHF1aWNrIGZpbHRlclxuICAgIGlmIChxdWlja0ZpbHRlclByZXNlbnQpIHtcbiAgICAgICAgaWYgKCFub2RlLnF1aWNrRmlsdGVyQWdncmVnYXRlVGV4dCkge1xuICAgICAgICAgICAgdGhpcy5hZ2dyZWdhdGVSb3dGb3JRdWlja0ZpbHRlcihub2RlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobm9kZS5xdWlja0ZpbHRlckFnZ3JlZ2F0ZVRleHQuaW5kZXhPZih0aGlzLmFuZ3VsYXJHcmlkLmdldFF1aWNrRmlsdGVyKCkpIDwgMCkge1xuICAgICAgICAgICAgLy9xdWljayBmaWx0ZXIgZmFpbHMsIHNvIHNraXAgaXRlbVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy9zZWNvbmQsIGNoZWNrIGFkdmFuY2VkIGZpbHRlclxuICAgIGlmIChhZHZhbmNlZEZpbHRlclByZXNlbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmZpbHRlck1hbmFnZXIuZG9lc0ZpbHRlclBhc3Mobm9kZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vZ290IHRoaXMgZmFyLCBhbGwgZmlsdGVycyBwYXNzXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBwcml2YXRlXG5Jbk1lbW9yeVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmFnZ3JlZ2F0ZVJvd0ZvclF1aWNrRmlsdGVyID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBhZ2dyZWdhdGVkVGV4dCA9ICcnO1xuICAgIHRoaXMuY29sdW1uTW9kZWwuZ2V0QWxsQ29sdW1ucygpLmZvckVhY2goZnVuY3Rpb24oY29sRGVmV3JhcHBlcikge1xuICAgICAgICB2YXIgZGF0YSA9IG5vZGUuZGF0YTtcbiAgICAgICAgdmFyIHZhbHVlID0gZGF0YSA/IGRhdGFbY29sRGVmV3JhcHBlci5jb2xEZWYuZmllbGRdIDogbnVsbDtcbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgYWdncmVnYXRlZFRleHQgPSBhZ2dyZWdhdGVkVGV4dCArIHZhbHVlLnRvU3RyaW5nKCkudG9VcHBlckNhc2UoKSArIFwiX1wiO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgbm9kZS5xdWlja0ZpbHRlckFnZ3JlZ2F0ZVRleHQgPSBhZ2dyZWdhdGVkVGV4dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW5NZW1vcnlSb3dDb250cm9sbGVyO1xuIiwidmFyIHRlbXBsYXRlID0gcmVxdWlyZSgnLi9wYWdpbmF0aW9uUGFuZWwuaHRtbCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5mdW5jdGlvbiBQYWdpbmF0aW9uQ29udHJvbGxlcigpIHt9XG5cblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oYW5ndWxhckdyaWQsIGdyaWRPcHRpb25zV3JhcHBlcikge1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xuICAgIHRoaXMuYW5ndWxhckdyaWQgPSBhbmd1bGFyR3JpZDtcbiAgICB0aGlzLnNldHVwQ29tcG9uZW50cygpO1xuICAgIHRoaXMuY2FsbFZlcnNpb24gPSAwO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnNldERhdGFzb3VyY2UgPSBmdW5jdGlvbihkYXRhc291cmNlKSB7XG4gICAgdGhpcy5kYXRhc291cmNlID0gZGF0YXNvdXJjZTtcblxuICAgIGlmICghZGF0YXNvdXJjZSkge1xuICAgICAgICAvLyBvbmx5IGNvbnRpbnVlIGlmIHdlIGhhdmUgYSB2YWxpZCBkYXRhc291cmNlIHRvIHdvcmsgd2l0aFxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5yZXNldCgpO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gY29weSBwYWdlU2l6ZSwgdG8gZ3VhcmQgYWdhaW5zdCBpdCBjaGFuZ2luZyB0aGUgdGhlIGRhdGFzb3VyY2UgYmV0d2VlbiBjYWxsc1xuICAgIGlmICh0aGlzLmRhdGFzb3VyY2UucGFnZVNpemUgJiYgdHlwZW9mIHRoaXMuZGF0YXNvdXJjZS5wYWdlU2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdkYXRhc291cmNlLnBhZ2VTaXplIHNob3VsZCBiZSBhIG51bWJlcicpO1xuICAgIH1cbiAgICB0aGlzLnBhZ2VTaXplID0gdGhpcy5kYXRhc291cmNlLnBhZ2VTaXplO1xuICAgIC8vIHNlZSBpZiB3ZSBrbm93IHRoZSB0b3RhbCBudW1iZXIgb2YgcGFnZXMsIG9yIGlmIGl0J3MgJ3RvIGJlIGRlY2lkZWQnXG4gICAgaWYgKHR5cGVvZiB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQgPT09ICdudW1iZXInICYmIHRoaXMuZGF0YXNvdXJjZS5yb3dDb3VudCA+PSAwKSB7XG4gICAgICAgIHRoaXMucm93Q291bnQgPSB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQ7XG4gICAgICAgIHRoaXMuZm91bmRNYXhSb3cgPSB0cnVlO1xuICAgICAgICB0aGlzLmNhbGN1bGF0ZVRvdGFsUGFnZXMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJvd0NvdW50ID0gMDtcbiAgICAgICAgdGhpcy5mb3VuZE1heFJvdyA9IGZhbHNlO1xuICAgICAgICB0aGlzLnRvdGFsUGFnZXMgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudFBhZ2UgPSAwO1xuXG4gICAgLy8gaGlkZSB0aGUgc3VtbWFyeSBwYW5lbCB1bnRpbCBzb21ldGhpbmcgaXMgbG9hZGVkXG4gICAgdGhpcy5lUGFnZVJvd1N1bW1hcnlQYW5lbC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG5cbiAgICB0aGlzLnNldFRvdGFsTGFiZWxzKCk7XG4gICAgdGhpcy5sb2FkUGFnZSgpO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnNldFRvdGFsTGFiZWxzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZm91bmRNYXhSb3cpIHtcbiAgICAgICAgdGhpcy5sYlRvdGFsLmlubmVySFRNTCA9IHRoaXMudG90YWxQYWdlcy50b0xvY2FsZVN0cmluZygpO1xuICAgICAgICB0aGlzLmxiUmVjb3JkQ291bnQuaW5uZXJIVE1MID0gdGhpcy5yb3dDb3VudC50b0xvY2FsZVN0cmluZygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBtb3JlVGV4dCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldExvY2FsZVRleHRGdW5jKCkoJ21vcmUnLCAnbW9yZScpO1xuICAgICAgICB0aGlzLmxiVG90YWwuaW5uZXJIVE1MID0gbW9yZVRleHQ7XG4gICAgICAgIHRoaXMubGJSZWNvcmRDb3VudC5pbm5lckhUTUwgPSBtb3JlVGV4dDtcbiAgICB9XG59O1xuXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuY2FsY3VsYXRlVG90YWxQYWdlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudG90YWxQYWdlcyA9IE1hdGguZmxvb3IoKHRoaXMucm93Q291bnQgLSAxKSAvIHRoaXMucGFnZVNpemUpICsgMTtcbn07XG5cblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5wYWdlTG9hZGVkID0gZnVuY3Rpb24ocm93cywgbGFzdFJvd0luZGV4KSB7XG4gICAgdmFyIGZpcnN0SWQgPSB0aGlzLmN1cnJlbnRQYWdlICogdGhpcy5wYWdlU2l6ZTtcbiAgICB0aGlzLmFuZ3VsYXJHcmlkLnNldFJvd3Mocm93cywgZmlyc3RJZCk7XG4gICAgLy8gc2VlIGlmIHdlIGhpdCB0aGUgbGFzdCByb3dcbiAgICBpZiAoIXRoaXMuZm91bmRNYXhSb3cgJiYgdHlwZW9mIGxhc3RSb3dJbmRleCA9PT0gJ251bWJlcicgJiYgbGFzdFJvd0luZGV4ID49IDApIHtcbiAgICAgICAgdGhpcy5mb3VuZE1heFJvdyA9IHRydWU7XG4gICAgICAgIHRoaXMucm93Q291bnQgPSBsYXN0Um93SW5kZXg7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlVG90YWxQYWdlcygpO1xuICAgICAgICB0aGlzLnNldFRvdGFsTGFiZWxzKCk7XG5cbiAgICAgICAgLy8gaWYgb3ZlcnNob3QgcGFnZXMsIGdvIGJhY2tcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudFBhZ2UgPiB0aGlzLnRvdGFsUGFnZXMpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFBhZ2UgPSB0aGlzLnRvdGFsUGFnZXMgLSAxO1xuICAgICAgICAgICAgdGhpcy5sb2FkUGFnZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuZW5hYmxlT3JEaXNhYmxlQnV0dG9ucygpO1xuICAgIHRoaXMudXBkYXRlUm93TGFiZWxzKCk7XG59O1xuXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlUm93TGFiZWxzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXJ0Um93O1xuICAgIHZhciBlbmRSb3c7XG4gICAgaWYgKHRoaXMuaXNaZXJvUGFnZXNUb0Rpc3BsYXkoKSkge1xuICAgICAgICBzdGFydFJvdyA9IDA7XG4gICAgICAgIGVuZFJvdyA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3RhcnRSb3cgPSAodGhpcy5wYWdlU2l6ZSAqIHRoaXMuY3VycmVudFBhZ2UpICsgMTtcbiAgICAgICAgZW5kUm93ID0gc3RhcnRSb3cgKyB0aGlzLnBhZ2VTaXplIC0gMTtcbiAgICAgICAgaWYgKHRoaXMuZm91bmRNYXhSb3cgJiYgZW5kUm93ID4gdGhpcy5yb3dDb3VudCkge1xuICAgICAgICAgICAgZW5kUm93ID0gdGhpcy5yb3dDb3VudDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmxiRmlyc3RSb3dPblBhZ2UuaW5uZXJIVE1MID0gKHN0YXJ0Um93KS50b0xvY2FsZVN0cmluZygpO1xuICAgIHRoaXMubGJMYXN0Um93T25QYWdlLmlubmVySFRNTCA9IChlbmRSb3cpLnRvTG9jYWxlU3RyaW5nKCk7XG5cbiAgICAvLyBzaG93IHRoZSBzdW1tYXJ5IHBhbmVsLCB3aGVuIGZpcnN0IHNob3duLCB0aGlzIGlzIGJsYW5rXG4gICAgdGhpcy5lUGFnZVJvd1N1bW1hcnlQYW5lbC5zdHlsZS52aXNpYmlsaXR5ID0gbnVsbDtcbn07XG5cblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5sb2FkUGFnZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZW5hYmxlT3JEaXNhYmxlQnV0dG9ucygpO1xuICAgIHZhciBzdGFydFJvdyA9IHRoaXMuY3VycmVudFBhZ2UgKiB0aGlzLmRhdGFzb3VyY2UucGFnZVNpemU7XG4gICAgdmFyIGVuZFJvdyA9ICh0aGlzLmN1cnJlbnRQYWdlICsgMSkgKiB0aGlzLmRhdGFzb3VyY2UucGFnZVNpemU7XG5cbiAgICB0aGlzLmxiQ3VycmVudC5pbm5lckhUTUwgPSAodGhpcy5jdXJyZW50UGFnZSArIDEpLnRvTG9jYWxlU3RyaW5nKCk7XG5cbiAgICB0aGlzLmNhbGxWZXJzaW9uKys7XG4gICAgdmFyIGNhbGxWZXJzaW9uQ29weSA9IHRoaXMuY2FsbFZlcnNpb247XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRoaXMuYW5ndWxhckdyaWQuc2hvd0xvYWRpbmdQYW5lbCh0cnVlKTtcblxuICAgIHZhciBzb3J0TW9kZWw7XG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcoKSkge1xuICAgICAgICBzb3J0TW9kZWwgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldFNvcnRNb2RlbCgpO1xuICAgIH1cblxuICAgIHZhciBmaWx0ZXJNb2RlbDtcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVTZXJ2ZXJTaWRlRmlsdGVyKCkpIHtcbiAgICAgICAgZmlsdGVyTW9kZWwgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldEZpbHRlck1vZGVsKCk7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgc3RhcnRSb3c6IHN0YXJ0Um93LFxuICAgICAgICBlbmRSb3c6IGVuZFJvdyxcbiAgICAgICAgc3VjY2Vzc0NhbGxiYWNrOiBzdWNjZXNzQ2FsbGJhY2ssXG4gICAgICAgIGZhaWxDYWxsYmFjazogZmFpbENhbGxiYWNrLFxuICAgICAgICBzb3J0TW9kZWw6IHNvcnRNb2RlbCxcbiAgICAgICAgZmlsdGVyTW9kZWw6IGZpbHRlck1vZGVsXG4gICAgfTtcblxuICAgIC8vIGNoZWNrIGlmIG9sZCB2ZXJzaW9uIG9mIGRhdGFzb3VyY2UgdXNlZFxuICAgIHZhciBnZXRSb3dzUGFyYW1zID0gdXRpbHMuZ2V0RnVuY3Rpb25QYXJhbWV0ZXJzKHRoaXMuZGF0YXNvdXJjZS5nZXRSb3dzKTtcbiAgICBpZiAoZ2V0Um93c1BhcmFtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogSXQgbG9va3MgbGlrZSB5b3VyIHBhZ2luZyBkYXRhc291cmNlIGlzIG9mIHRoZSBvbGQgdHlwZSwgdGFraW5nIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyLicpO1xuICAgICAgICBjb25zb2xlLndhcm4oJ2FnLWdyaWQ6IEZyb20gYWctZ3JpZCAxLjkuMCwgbm93IHRoZSBnZXRSb3dzIHRha2VzIG9uZSBwYXJhbWV0ZXIuIFNlZSB0aGUgZG9jdW1lbnRhdGlvbiBmb3IgZGV0YWlscy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLmRhdGFzb3VyY2UuZ2V0Um93cyhwYXJhbXMpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKHJvd3MsIGxhc3RSb3dJbmRleCkge1xuICAgICAgICBpZiAodGhhdC5pc0NhbGxEYWVtb24oY2FsbFZlcnNpb25Db3B5KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoYXQucGFnZUxvYWRlZChyb3dzLCBsYXN0Um93SW5kZXgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZhaWxDYWxsYmFjaygpIHtcbiAgICAgICAgaWYgKHRoYXQuaXNDYWxsRGFlbW9uKGNhbGxWZXJzaW9uQ29weSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXQgaW4gYW4gZW1wdHkgc2V0IG9mIHJvd3MsIHRoaXMgd2lsbCBhdFxuICAgICAgICAvLyBsZWFzdCBnZXQgcmlkIG9mIHRoZSBsb2FkaW5nIHBhbmVsLCBhbmRcbiAgICAgICAgLy8gc3RvcCBibG9ja2luZyB0aGluZ3NcbiAgICAgICAgdGhhdC5hbmd1bGFyR3JpZC5zZXRSb3dzKFtdKTtcbiAgICB9XG59O1xuXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuaXNDYWxsRGFlbW9uID0gZnVuY3Rpb24odmVyc2lvbkNvcHkpIHtcbiAgICByZXR1cm4gdmVyc2lvbkNvcHkgIT09IHRoaXMuY2FsbFZlcnNpb247XG59O1xuXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUub25CdE5leHQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmN1cnJlbnRQYWdlKys7XG4gICAgdGhpcy5sb2FkUGFnZSgpO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLm9uQnRQcmV2aW91cyA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY3VycmVudFBhZ2UtLTtcbiAgICB0aGlzLmxvYWRQYWdlKCk7XG59O1xuXG5QYWdpbmF0aW9uQ29udHJvbGxlci5wcm90b3R5cGUub25CdEZpcnN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IDA7XG4gICAgdGhpcy5sb2FkUGFnZSgpO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLm9uQnRMYXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jdXJyZW50UGFnZSA9IHRoaXMudG90YWxQYWdlcyAtIDE7XG4gICAgdGhpcy5sb2FkUGFnZSgpO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmlzWmVyb1BhZ2VzVG9EaXNwbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZm91bmRNYXhSb3cgJiYgdGhpcy50b3RhbFBhZ2VzID09PSAwO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmVuYWJsZU9yRGlzYWJsZUJ1dHRvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGlzYWJsZVByZXZpb3VzQW5kRmlyc3QgPSB0aGlzLmN1cnJlbnRQYWdlID09PSAwO1xuICAgIHRoaXMuYnRQcmV2aW91cy5kaXNhYmxlZCA9IGRpc2FibGVQcmV2aW91c0FuZEZpcnN0O1xuICAgIHRoaXMuYnRGaXJzdC5kaXNhYmxlZCA9IGRpc2FibGVQcmV2aW91c0FuZEZpcnN0O1xuXG4gICAgdmFyIHplcm9QYWdlc1RvRGlzcGxheSA9IHRoaXMuaXNaZXJvUGFnZXNUb0Rpc3BsYXkoKTtcbiAgICB2YXIgb25MYXN0UGFnZSA9IHRoaXMuZm91bmRNYXhSb3cgJiYgdGhpcy5jdXJyZW50UGFnZSA9PT0gKHRoaXMudG90YWxQYWdlcyAtIDEpO1xuXG4gICAgdmFyIGRpc2FibGVOZXh0ID0gb25MYXN0UGFnZSB8fCB6ZXJvUGFnZXNUb0Rpc3BsYXk7XG4gICAgdGhpcy5idE5leHQuZGlzYWJsZWQgPSBkaXNhYmxlTmV4dDtcblxuICAgIHZhciBkaXNhYmxlTGFzdCA9ICF0aGlzLmZvdW5kTWF4Um93IHx8IHplcm9QYWdlc1RvRGlzcGxheSB8fCB0aGlzLmN1cnJlbnRQYWdlID09PSAodGhpcy50b3RhbFBhZ2VzIC0gMSk7XG4gICAgdGhpcy5idExhc3QuZGlzYWJsZWQgPSBkaXNhYmxlTGFzdDtcbn07XG5cblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5jcmVhdGVUZW1wbGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsb2NhbGVUZXh0RnVuYyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldExvY2FsZVRleHRGdW5jKCk7XG4gICAgcmV0dXJuIHRlbXBsYXRlXG4gICAgICAgIC5yZXBsYWNlKCdbUEFHRV0nLCBsb2NhbGVUZXh0RnVuYygncGFnZScsICdQYWdlJykpXG4gICAgICAgIC5yZXBsYWNlKCdbVE9dJywgbG9jYWxlVGV4dEZ1bmMoJ3RvJywgJ3RvJykpXG4gICAgICAgIC5yZXBsYWNlKCdbT0ZdJywgbG9jYWxlVGV4dEZ1bmMoJ29mJywgJ29mJykpXG4gICAgICAgIC5yZXBsYWNlKCdbT0ZdJywgbG9jYWxlVGV4dEZ1bmMoJ29mJywgJ29mJykpXG4gICAgICAgIC5yZXBsYWNlKCdbRklSU1RdJywgbG9jYWxlVGV4dEZ1bmMoJ2ZpcnN0JywgJ0ZpcnN0JykpXG4gICAgICAgIC5yZXBsYWNlKCdbUFJFVklPVVNdJywgbG9jYWxlVGV4dEZ1bmMoJ3ByZXZpb3VzJywgJ1ByZXZpb3VzJykpXG4gICAgICAgIC5yZXBsYWNlKCdbTkVYVF0nLCBsb2NhbGVUZXh0RnVuYygnbmV4dCcsICdOZXh0JykpXG4gICAgICAgIC5yZXBsYWNlKCdbTEFTVF0nLCBsb2NhbGVUZXh0RnVuYygnbGFzdCcsICdMYXN0JykpO1xufTtcblxuUGFnaW5hdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmdldEd1aT0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZUd1aTtcbn07XG5cblBhZ2luYXRpb25Db250cm9sbGVyLnByb3RvdHlwZS5zZXR1cENvbXBvbmVudHMgPSBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuZUd1aSA9IHV0aWxzLmxvYWRUZW1wbGF0ZSh0aGlzLmNyZWF0ZVRlbXBsYXRlKCkpO1xuXG4gICAgdGhpcy5idE5leHQgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2J0TmV4dCcpO1xuICAgIHRoaXMuYnRQcmV2aW91cyA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjYnRQcmV2aW91cycpO1xuICAgIHRoaXMuYnRGaXJzdCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjYnRGaXJzdCcpO1xuICAgIHRoaXMuYnRMYXN0ID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNidExhc3QnKTtcbiAgICB0aGlzLmxiQ3VycmVudCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjY3VycmVudCcpO1xuICAgIHRoaXMubGJUb3RhbCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjdG90YWwnKTtcblxuICAgIHRoaXMubGJSZWNvcmRDb3VudCA9IHRoaXMuZUd1aS5xdWVyeVNlbGVjdG9yKCcjcmVjb3JkQ291bnQnKTtcbiAgICB0aGlzLmxiRmlyc3RSb3dPblBhZ2UgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2ZpcnN0Um93T25QYWdlJyk7XG4gICAgdGhpcy5sYkxhc3RSb3dPblBhZ2UgPSB0aGlzLmVHdWkucXVlcnlTZWxlY3RvcignI2xhc3RSb3dPblBhZ2UnKTtcbiAgICB0aGlzLmVQYWdlUm93U3VtbWFyeVBhbmVsID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoJyNwYWdlUm93U3VtbWFyeVBhbmVsJyk7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICB0aGlzLmJ0TmV4dC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0Lm9uQnROZXh0KCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmJ0UHJldmlvdXMuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5vbkJ0UHJldmlvdXMoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYnRGaXJzdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0Lm9uQnRGaXJzdCgpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5idExhc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5vbkJ0TGFzdCgpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYWdpbmF0aW9uQ29udHJvbGxlcjtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPWFnLXBhZ2luZy1wYW5lbD48c3BhbiBpZD1wYWdlUm93U3VtbWFyeVBhbmVsIGNsYXNzPWFnLXBhZ2luZy1yb3ctc3VtbWFyeS1wYW5lbD48c3BhbiBpZD1maXJzdFJvd09uUGFnZT48L3NwYW4+IFtUT10gPHNwYW4gaWQ9bGFzdFJvd09uUGFnZT48L3NwYW4+IFtPRl0gPHNwYW4gaWQ9cmVjb3JkQ291bnQ+PC9zcGFuPjwvc3Bhbj4gPHNwYW4gY2xhc3M9YWctcGFnaW5nLXBhZ2Utc3VtbWFyeS1wYW5lbD48YnV0dG9uIGNsYXNzPWFnLXBhZ2luZy1idXR0b24gaWQ9YnRGaXJzdD5bRklSU1RdPC9idXR0b24+IDxidXR0b24gY2xhc3M9YWctcGFnaW5nLWJ1dHRvbiBpZD1idFByZXZpb3VzPltQUkVWSU9VU108L2J1dHRvbj4gW1BBR0VdIDxzcGFuIGlkPWN1cnJlbnQ+PC9zcGFuPiBbT0ZdIDxzcGFuIGlkPXRvdGFsPjwvc3Bhbj4gPGJ1dHRvbiBjbGFzcz1hZy1wYWdpbmctYnV0dG9uIGlkPWJ0TmV4dD5bTkVYVF08L2J1dHRvbj4gPGJ1dHRvbiBjbGFzcz1hZy1wYWdpbmctYnV0dG9uIGlkPWJ0TGFzdD5bTEFTVF08L2J1dHRvbj48L3NwYW4+PC9kaXY+XCI7XG4iLCIvKlxuICogVGhpcyByb3cgY29udHJvbGxlciBpcyB1c2VkIGZvciBpbmZpbml0ZSBzY3JvbGxpbmcgb25seS4gRm9yIG5vcm1hbCAnaW4gbWVtb3J5JyB0YWJsZSxcbiAqIG9yIHN0YW5kYXJkIHBhZ2luYXRpb24sIHRoZSBpbk1lbW9yeVJvd0NvbnRyb2xsZXIgaXMgdXNlZC5cbiAqL1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIGxvZ2dpbmcgPSBmYWxzZTtcblxuZnVuY3Rpb24gVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyKCkge31cblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24ocm93UmVuZGVyZXIsIGdyaWRPcHRpb25zV3JhcHBlciwgYW5ndWxhckdyaWQpIHtcbiAgICB0aGlzLnJvd1JlbmRlcmVyID0gcm93UmVuZGVyZXI7XG4gICAgdGhpcy5kYXRhc291cmNlVmVyc2lvbiA9IDA7XG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBncmlkT3B0aW9uc1dyYXBwZXI7XG4gICAgdGhpcy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkO1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5zZXREYXRhc291cmNlID0gZnVuY3Rpb24oZGF0YXNvdXJjZSkge1xuICAgIHRoaXMuZGF0YXNvdXJjZSA9IGRhdGFzb3VyY2U7XG5cbiAgICBpZiAoIWRhdGFzb3VyY2UpIHtcbiAgICAgICAgLy8gb25seSBjb250aW51ZSBpZiB3ZSBoYXZlIGEgdmFsaWQgZGF0YXNvdXJjZSB0byB3b3JraW5nIHdpdGhcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMucmVzZXQoKTtcbn07XG5cblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBzZWUgaWYgZGF0YXNvdXJjZSBrbm93cyBob3cgbWFueSByb3dzIHRoZXJlIGFyZVxuICAgIGlmICh0eXBlb2YgdGhpcy5kYXRhc291cmNlLnJvd0NvdW50ID09PSAnbnVtYmVyJyAmJiB0aGlzLmRhdGFzb3VyY2Uucm93Q291bnQgPj0gMCkge1xuICAgICAgICB0aGlzLnZpcnR1YWxSb3dDb3VudCA9IHRoaXMuZGF0YXNvdXJjZS5yb3dDb3VudDtcbiAgICAgICAgdGhpcy5mb3VuZE1heFJvdyA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy52aXJ0dWFsUm93Q291bnQgPSAwO1xuICAgICAgICB0aGlzLmZvdW5kTWF4Um93ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gaW4gY2FzZSBhbnkgZGFlbW9uIHJlcXVlc3RzIGNvbWluZyBmcm9tIGRhdGFzb3VyY2UsIHdlIGtub3cgaXQgaWdub3JlIHRoZW1cbiAgICB0aGlzLmRhdGFzb3VyY2VWZXJzaW9uKys7XG5cbiAgICAvLyBtYXAgb2YgcGFnZSBudW1iZXJzIHRvIHJvd3MgaW4gdGhhdCBwYWdlXG4gICAgdGhpcy5wYWdlQ2FjaGUgPSB7fTtcbiAgICB0aGlzLnBhZ2VDYWNoZVNpemUgPSAwO1xuXG4gICAgLy8gaWYgYSBudW1iZXIgaXMgaW4gdGhpcyBhcnJheSwgaXQgbWVhbnMgd2UgYXJlIHBlbmRpbmcgYSBsb2FkIGZyb20gaXRcbiAgICB0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MgPSBbXTtcbiAgICB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZCA9IFtdO1xuICAgIHRoaXMucGFnZUFjY2Vzc1RpbWVzID0ge307IC8vIGtlZXBzIGEgcmVjb3JkIG9mIHdoZW4gZWFjaCBwYWdlIHdhcyBsYXN0IHZpZXdlZCwgdXNlZCBmb3IgTFJVIGNhY2hlXG4gICAgdGhpcy5hY2Nlc3NUaW1lID0gMDsgLy8gcmF0aGVyIHRoYW4gdXNpbmcgdGhlIGNsb2NrLCB3ZSB1c2UgdGhpcyBjb3VudGVyXG5cbiAgICAvLyB0aGUgbnVtYmVyIG9mIGNvbmN1cnJlbnQgbG9hZHMgd2UgYXJlIGFsbG93ZWQgdG8gdGhlIHNlcnZlclxuICAgIGlmICh0eXBlb2YgdGhpcy5kYXRhc291cmNlLm1heENvbmN1cnJlbnRSZXF1ZXN0cyA9PT0gJ251bWJlcicgJiYgdGhpcy5kYXRhc291cmNlLm1heENvbmN1cnJlbnRSZXF1ZXN0cyA+IDApIHtcbiAgICAgICAgdGhpcy5tYXhDb25jdXJyZW50RGF0YXNvdXJjZVJlcXVlc3RzID0gdGhpcy5kYXRhc291cmNlLm1heENvbmN1cnJlbnRSZXF1ZXN0cztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1heENvbmN1cnJlbnREYXRhc291cmNlUmVxdWVzdHMgPSAyO1xuICAgIH1cblxuICAgIC8vIHRoZSBudW1iZXIgb2YgcGFnZXMgdG8ga2VlcCBpbiBicm93c2VyIGNhY2hlXG4gICAgaWYgKHR5cGVvZiB0aGlzLmRhdGFzb3VyY2UubWF4UGFnZXNJbkNhY2hlID09PSAnbnVtYmVyJyAmJiB0aGlzLmRhdGFzb3VyY2UubWF4UGFnZXNJbkNhY2hlID4gMCkge1xuICAgICAgICB0aGlzLm1heFBhZ2VzSW5DYWNoZSA9IHRoaXMuZGF0YXNvdXJjZS5tYXhQYWdlc0luQ2FjaGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbnVsbCBpcyBkZWZhdWx0LCBtZWFucyBkb24ndCAgaGF2ZSBhbnkgbWF4IHNpemUgb24gdGhlIGNhY2hlXG4gICAgICAgIHRoaXMubWF4UGFnZXNJbkNhY2hlID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLnBhZ2VTaXplID0gdGhpcy5kYXRhc291cmNlLnBhZ2VTaXplOyAvLyB0YWtlIGEgY29weSBvZiBwYWdlIHNpemUsIHdlIGRvbid0IHdhbnQgaXQgY2hhbmdpbmdcbiAgICB0aGlzLm92ZXJmbG93U2l6ZSA9IHRoaXMuZGF0YXNvdXJjZS5vdmVyZmxvd1NpemU7IC8vIHRha2UgYSBjb3B5IG9mIHBhZ2Ugc2l6ZSwgd2UgZG9uJ3Qgd2FudCBpdCBjaGFuZ2luZ1xuXG4gICAgdGhpcy5kb0xvYWRPclF1ZXVlKDApO1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5jcmVhdGVOb2Rlc0Zyb21Sb3dzID0gZnVuY3Rpb24ocGFnZU51bWJlciwgcm93cykge1xuICAgIHZhciBub2RlcyA9IFtdO1xuICAgIGlmIChyb3dzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBqID0gcm93cy5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB2aXJ0dWFsUm93SW5kZXggPSAocGFnZU51bWJlciAqIHRoaXMucGFnZVNpemUpICsgaTtcbiAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIGRhdGE6IHJvd3NbaV0sXG4gICAgICAgICAgICAgICAgaWQ6IHZpcnR1YWxSb3dJbmRleFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5vZGVzO1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVGcm9tTG9hZGluZyA9IGZ1bmN0aW9uKHBhZ2VOdW1iZXIpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MuaW5kZXhPZihwYWdlTnVtYmVyKTtcbiAgICB0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3Muc3BsaWNlKGluZGV4LCAxKTtcbn07XG5cblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUucGFnZUxvYWRGYWlsZWQgPSBmdW5jdGlvbihwYWdlTnVtYmVyKSB7XG4gICAgdGhpcy5yZW1vdmVGcm9tTG9hZGluZyhwYWdlTnVtYmVyKTtcbiAgICB0aGlzLmNoZWNrUXVldWVGb3JOZXh0TG9hZCgpO1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5wYWdlTG9hZGVkID0gZnVuY3Rpb24ocGFnZU51bWJlciwgcm93cywgbGFzdFJvdykge1xuICAgIHRoaXMucHV0UGFnZUludG9DYWNoZUFuZFB1cmdlKHBhZ2VOdW1iZXIsIHJvd3MpO1xuICAgIHRoaXMuY2hlY2tNYXhSb3dBbmRJbmZvcm1Sb3dSZW5kZXJlcihwYWdlTnVtYmVyLCBsYXN0Um93KTtcbiAgICB0aGlzLnJlbW92ZUZyb21Mb2FkaW5nKHBhZ2VOdW1iZXIpO1xuICAgIHRoaXMuY2hlY2tRdWV1ZUZvck5leHRMb2FkKCk7XG59O1xuXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLnB1dFBhZ2VJbnRvQ2FjaGVBbmRQdXJnZSA9IGZ1bmN0aW9uKHBhZ2VOdW1iZXIsIHJvd3MpIHtcbiAgICB0aGlzLnBhZ2VDYWNoZVtwYWdlTnVtYmVyXSA9IHRoaXMuY3JlYXRlTm9kZXNGcm9tUm93cyhwYWdlTnVtYmVyLCByb3dzKTtcbiAgICB0aGlzLnBhZ2VDYWNoZVNpemUrKztcbiAgICBpZiAobG9nZ2luZykge1xuICAgICAgICBjb25zb2xlLmxvZygnYWRkaW5nIHBhZ2UgJyArIHBhZ2VOdW1iZXIpO1xuICAgIH1cblxuICAgIHZhciBuZWVkVG9QdXJnZSA9IHRoaXMubWF4UGFnZXNJbkNhY2hlICYmIHRoaXMubWF4UGFnZXNJbkNhY2hlIDwgdGhpcy5wYWdlQ2FjaGVTaXplO1xuICAgIGlmIChuZWVkVG9QdXJnZSkge1xuICAgICAgICAvLyBmaW5kIHRoZSBMUlUgcGFnZVxuICAgICAgICB2YXIgeW91bmdlc3RQYWdlSW5kZXggPSB0aGlzLmZpbmRMZWFzdFJlY2VudGx5QWNjZXNzZWRQYWdlKE9iamVjdC5rZXlzKHRoaXMucGFnZUNhY2hlKSk7XG5cbiAgICAgICAgaWYgKGxvZ2dpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwdXJnaW5nIHBhZ2UgJyArIHlvdW5nZXN0UGFnZUluZGV4ICsgJyBmcm9tIGNhY2hlICcgKyBPYmplY3Qua2V5cyh0aGlzLnBhZ2VDYWNoZSkpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSB0aGlzLnBhZ2VDYWNoZVt5b3VuZ2VzdFBhZ2VJbmRleF07XG4gICAgICAgIHRoaXMucGFnZUNhY2hlU2l6ZS0tO1xuICAgIH1cblxufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5jaGVja01heFJvd0FuZEluZm9ybVJvd1JlbmRlcmVyID0gZnVuY3Rpb24ocGFnZU51bWJlciwgbGFzdFJvdykge1xuICAgIGlmICghdGhpcy5mb3VuZE1heFJvdykge1xuICAgICAgICAvLyBpZiB3ZSBrbm93IHRoZSBsYXN0IHJvdywgdXNlIGlmXG4gICAgICAgIGlmICh0eXBlb2YgbGFzdFJvdyA9PT0gJ251bWJlcicgJiYgbGFzdFJvdyA+PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnZpcnR1YWxSb3dDb3VudCA9IGxhc3RSb3c7XG4gICAgICAgICAgICB0aGlzLmZvdW5kTWF4Um93ID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgc2VlIGlmIHdlIG5lZWQgdG8gYWRkIHNvbWUgdmlydHVhbCByb3dzXG4gICAgICAgICAgICB2YXIgdGhpc1BhZ2VQbHVzQnVmZmVyID0gKChwYWdlTnVtYmVyICsgMSkgKiB0aGlzLnBhZ2VTaXplKSArIHRoaXMub3ZlcmZsb3dTaXplO1xuICAgICAgICAgICAgaWYgKHRoaXMudmlydHVhbFJvd0NvdW50IDwgdGhpc1BhZ2VQbHVzQnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy52aXJ0dWFsUm93Q291bnQgPSB0aGlzUGFnZVBsdXNCdWZmZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgcm93Q291bnQgY2hhbmdlcywgcmVmcmVzaFZpZXcsIG90aGVyd2lzZSBqdXN0IHJlZnJlc2hBbGxWaXJ0dWFsUm93c1xuICAgICAgICB0aGlzLnJvd1JlbmRlcmVyLnJlZnJlc2hWaWV3KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yb3dSZW5kZXJlci5yZWZyZXNoQWxsVmlydHVhbFJvd3MoKTtcbiAgICB9XG59O1xuXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmlzUGFnZUFscmVhZHlMb2FkaW5nID0gZnVuY3Rpb24ocGFnZU51bWJlcikge1xuICAgIHZhciByZXN1bHQgPSB0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MuaW5kZXhPZihwYWdlTnVtYmVyKSA+PSAwIHx8IHRoaXMucGFnZUxvYWRzUXVldWVkLmluZGV4T2YocGFnZU51bWJlcikgPj0gMDtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5kb0xvYWRPclF1ZXVlID0gZnVuY3Rpb24ocGFnZU51bWJlcikge1xuICAgIC8vIGlmIHdlIGFscmVhZHkgdHJpZWQgdG8gbG9hZCB0aGlzIHBhZ2UsIHRoZW4gaWdub3JlIHRoZSByZXF1ZXN0LFxuICAgIC8vIG90aGVyd2lzZSBzZXJ2ZXIgd291bGQgYmUgaGl0IDUwIHRpbWVzIGp1c3QgdG8gZGlzcGxheSBvbmUgcGFnZSwgdGhlXG4gICAgLy8gZmlyc3Qgcm93IHRvIGZpbmQgdGhlIHBhZ2UgbWlzc2luZyBpcyBlbm91Z2guXG4gICAgaWYgKHRoaXMuaXNQYWdlQWxyZWFkeUxvYWRpbmcocGFnZU51bWJlcikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHRyeSB0aGUgcGFnZSBsb2FkIC0gaWYgbm90IGFscmVhZHkgZG9pbmcgYSBsb2FkLCB0aGVuIHdlIGNhbiBnbyBhaGVhZFxuICAgIGlmICh0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MubGVuZ3RoIDwgdGhpcy5tYXhDb25jdXJyZW50RGF0YXNvdXJjZVJlcXVlc3RzKSB7XG4gICAgICAgIC8vIGdvIGFoZWFkLCBsb2FkIHRoZSBwYWdlXG4gICAgICAgIHRoaXMubG9hZFBhZ2UocGFnZU51bWJlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlLCBxdWV1ZSB0aGUgcmVxdWVzdFxuICAgICAgICB0aGlzLmFkZFRvUXVldWVBbmRQdXJnZVF1ZXVlKHBhZ2VOdW1iZXIpO1xuICAgIH1cbn07XG5cblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuYWRkVG9RdWV1ZUFuZFB1cmdlUXVldWUgPSBmdW5jdGlvbihwYWdlTnVtYmVyKSB7XG4gICAgaWYgKGxvZ2dpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3F1ZXVlaW5nICcgKyBwYWdlTnVtYmVyICsgJyAtICcgKyB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZCk7XG4gICAgfVxuICAgIHRoaXMucGFnZUxvYWRzUXVldWVkLnB1c2gocGFnZU51bWJlcik7XG5cbiAgICAvLyBzZWUgaWYgdGhlcmUgYXJlIG1vcmUgcGFnZXMgcXVldWVkIHRoYXQgYXJlIGFjdHVhbGx5IGluIG91ciBjYWNoZSwgaWYgc28gdGhlcmUgaXNcbiAgICAvLyBubyBwb2ludCBpbiBsb2FkaW5nIHRoZW0gYWxsIGFzIHNvbWUgd2lsbCBiZSBwdXJnZWQgYXMgc29vbiBhcyBsb2FkZWRcbiAgICB2YXIgbmVlZFRvUHVyZ2UgPSB0aGlzLm1heFBhZ2VzSW5DYWNoZSAmJiB0aGlzLm1heFBhZ2VzSW5DYWNoZSA8IHRoaXMucGFnZUxvYWRzUXVldWVkLmxlbmd0aDtcbiAgICBpZiAobmVlZFRvUHVyZ2UpIHtcbiAgICAgICAgLy8gZmluZCB0aGUgTFJVIHBhZ2VcbiAgICAgICAgdmFyIHlvdW5nZXN0UGFnZUluZGV4ID0gdGhpcy5maW5kTGVhc3RSZWNlbnRseUFjY2Vzc2VkUGFnZSh0aGlzLnBhZ2VMb2Fkc1F1ZXVlZCk7XG5cbiAgICAgICAgaWYgKGxvZ2dpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkZS1xdWV1ZWluZyAnICsgcGFnZU51bWJlciArICcgLSAnICsgdGhpcy5wYWdlTG9hZHNRdWV1ZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGluZGV4VG9SZW1vdmUgPSB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZC5pbmRleE9mKHlvdW5nZXN0UGFnZUluZGV4KTtcbiAgICAgICAgdGhpcy5wYWdlTG9hZHNRdWV1ZWQuc3BsaWNlKGluZGV4VG9SZW1vdmUsIDEpO1xuICAgIH1cbn07XG5cblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuZmluZExlYXN0UmVjZW50bHlBY2Nlc3NlZFBhZ2UgPSBmdW5jdGlvbihwYWdlSW5kZXhlcykge1xuICAgIHZhciB5b3VuZ2VzdFBhZ2VJbmRleCA9IC0xO1xuICAgIHZhciB5b3VuZ2VzdFBhZ2VBY2Nlc3NUaW1lID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG5cbiAgICBwYWdlSW5kZXhlcy5mb3JFYWNoKGZ1bmN0aW9uKHBhZ2VJbmRleCkge1xuICAgICAgICB2YXIgYWNjZXNzVGltZVRoaXNQYWdlID0gdGhhdC5wYWdlQWNjZXNzVGltZXNbcGFnZUluZGV4XTtcbiAgICAgICAgaWYgKGFjY2Vzc1RpbWVUaGlzUGFnZSA8IHlvdW5nZXN0UGFnZUFjY2Vzc1RpbWUpIHtcbiAgICAgICAgICAgIHlvdW5nZXN0UGFnZUFjY2Vzc1RpbWUgPSBhY2Nlc3NUaW1lVGhpc1BhZ2U7XG4gICAgICAgICAgICB5b3VuZ2VzdFBhZ2VJbmRleCA9IHBhZ2VJbmRleDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHlvdW5nZXN0UGFnZUluZGV4O1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5jaGVja1F1ZXVlRm9yTmV4dExvYWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wYWdlTG9hZHNRdWV1ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyB0YWtlIGZyb20gdGhlIGZyb250IG9mIHRoZSBxdWV1ZVxuICAgICAgICB2YXIgcGFnZVRvTG9hZCA9IHRoaXMucGFnZUxvYWRzUXVldWVkWzBdO1xuICAgICAgICB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZC5zcGxpY2UoMCwgMSk7XG5cbiAgICAgICAgaWYgKGxvZ2dpbmcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdkZXF1ZXVlaW5nICcgKyBwYWdlVG9Mb2FkICsgJyAtICcgKyB0aGlzLnBhZ2VMb2Fkc1F1ZXVlZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvYWRQYWdlKHBhZ2VUb0xvYWQpO1xuICAgIH1cbn07XG5cblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUubG9hZFBhZ2UgPSBmdW5jdGlvbihwYWdlTnVtYmVyKSB7XG5cbiAgICB0aGlzLnBhZ2VMb2Fkc0luUHJvZ3Jlc3MucHVzaChwYWdlTnVtYmVyKTtcblxuICAgIHZhciBzdGFydFJvdyA9IHBhZ2VOdW1iZXIgKiB0aGlzLnBhZ2VTaXplO1xuICAgIHZhciBlbmRSb3cgPSAocGFnZU51bWJlciArIDEpICogdGhpcy5wYWdlU2l6ZTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgZGF0YXNvdXJjZVZlcnNpb25Db3B5ID0gdGhpcy5kYXRhc291cmNlVmVyc2lvbjtcblxuICAgIHZhciBzb3J0TW9kZWw7XG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRW5hYmxlU2VydmVyU2lkZVNvcnRpbmcoKSkge1xuICAgICAgICBzb3J0TW9kZWwgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldFNvcnRNb2RlbCgpO1xuICAgIH1cblxuICAgIHZhciBmaWx0ZXJNb2RlbDtcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNFbmFibGVTZXJ2ZXJTaWRlRmlsdGVyKCkpIHtcbiAgICAgICAgZmlsdGVyTW9kZWwgPSB0aGlzLmFuZ3VsYXJHcmlkLmdldEZpbHRlck1vZGVsKCk7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgc3RhcnRSb3c6IHN0YXJ0Um93LFxuICAgICAgICBlbmRSb3c6IGVuZFJvdyxcbiAgICAgICAgc3VjY2Vzc0NhbGxiYWNrOiBzdWNjZXNzQ2FsbGJhY2ssXG4gICAgICAgIGZhaWxDYWxsYmFjazogZmFpbENhbGxiYWNrLFxuICAgICAgICBzb3J0TW9kZWw6IHNvcnRNb2RlbCxcbiAgICAgICAgZmlsdGVyTW9kZWw6IGZpbHRlck1vZGVsXG4gICAgfTtcblxuICAgIC8vIGNoZWNrIGlmIG9sZCB2ZXJzaW9uIG9mIGRhdGFzb3VyY2UgdXNlZFxuICAgIHZhciBnZXRSb3dzUGFyYW1zID0gdXRpbHMuZ2V0RnVuY3Rpb25QYXJhbWV0ZXJzKHRoaXMuZGF0YXNvdXJjZS5nZXRSb3dzKTtcbiAgICBpZiAoZ2V0Um93c1BhcmFtcy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignYWctZ3JpZDogSXQgbG9va3MgbGlrZSB5b3VyIHBhZ2luZyBkYXRhc291cmNlIGlzIG9mIHRoZSBvbGQgdHlwZSwgdGFraW5nIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyLicpO1xuICAgICAgICBjb25zb2xlLndhcm4oJ2FnLWdyaWQ6IEZyb20gYWctZ3JpZCAxLjkuMCwgbm93IHRoZSBnZXRSb3dzIHRha2VzIG9uZSBwYXJhbWV0ZXIuIFNlZSB0aGUgZG9jdW1lbnRhdGlvbiBmb3IgZGV0YWlscy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLmRhdGFzb3VyY2UuZ2V0Um93cyhwYXJhbXMpO1xuXG4gICAgZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKHJvd3MsIGxhc3RSb3dJbmRleCkge1xuICAgICAgICBpZiAodGhhdC5yZXF1ZXN0SXNEYWVtb24oZGF0YXNvdXJjZVZlcnNpb25Db3B5KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoYXQucGFnZUxvYWRlZChwYWdlTnVtYmVyLCByb3dzLCBsYXN0Um93SW5kZXgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZhaWxDYWxsYmFjaygpIHtcbiAgICAgICAgaWYgKHRoYXQucmVxdWVzdElzRGFlbW9uKGRhdGFzb3VyY2VWZXJzaW9uQ29weSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGF0LnBhZ2VMb2FkRmFpbGVkKHBhZ2VOdW1iZXIpO1xuICAgIH1cbn07XG5cbi8vIGNoZWNrIHRoYXQgdGhlIGRhdGFzb3VyY2UgaGFzIG5vdCBjaGFuZ2VkIHNpbmNlIHRoZSBsYXRzIHRpbWUgd2UgZGlkIGEgcmVxdWVzdFxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5yZXF1ZXN0SXNEYWVtb24gPSBmdW5jdGlvbihkYXRhc291cmNlVmVyc2lvbkNvcHkpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhc291cmNlVmVyc2lvbiAhPT0gZGF0YXNvdXJjZVZlcnNpb25Db3B5O1xufTtcblxuVmlydHVhbFBhZ2VSb3dDb250cm9sbGVyLnByb3RvdHlwZS5nZXRWaXJ0dWFsUm93ID0gZnVuY3Rpb24ocm93SW5kZXgpIHtcbiAgICBpZiAocm93SW5kZXggPiB0aGlzLnZpcnR1YWxSb3dDb3VudCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgcGFnZU51bWJlciA9IE1hdGguZmxvb3Iocm93SW5kZXggLyB0aGlzLnBhZ2VTaXplKTtcbiAgICB2YXIgcGFnZSA9IHRoaXMucGFnZUNhY2hlW3BhZ2VOdW1iZXJdO1xuXG4gICAgLy8gZm9yIExSVSBjYWNoZSwgdHJhY2sgd2hlbiB0aGlzIHBhZ2Ugd2FzIGxhc3QgaGl0XG4gICAgdGhpcy5wYWdlQWNjZXNzVGltZXNbcGFnZU51bWJlcl0gPSB0aGlzLmFjY2Vzc1RpbWUrKztcblxuICAgIGlmICghcGFnZSkge1xuICAgICAgICB0aGlzLmRvTG9hZE9yUXVldWUocGFnZU51bWJlcik7XG4gICAgICAgIC8vIHJldHVybiBiYWNrIGFuIGVtcHR5IHJvdywgc28gdGFibGUgY2FuIGF0IGxlYXN0IHJlbmRlciBlbXB0eSBjZWxsc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YToge30sXG4gICAgICAgICAgICBpZDogcm93SW5kZXhcbiAgICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaW5kZXhJblRoaXNQYWdlID0gcm93SW5kZXggJSB0aGlzLnBhZ2VTaXplO1xuICAgICAgICByZXR1cm4gcGFnZVtpbmRleEluVGhpc1BhZ2VdO1xuICAgIH1cbn07XG5cblZpcnR1YWxQYWdlUm93Q29udHJvbGxlci5wcm90b3R5cGUuZm9yRWFjaEluTWVtb3J5ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgcGFnZUtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnBhZ2VDYWNoZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGk8cGFnZUtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHBhZ2VLZXkgPSBwYWdlS2V5c1tpXTtcbiAgICAgICAgdmFyIHBhZ2UgPSB0aGlzLnBhZ2VDYWNoZVtwYWdlS2V5XTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGo8cGFnZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBwYWdlW2pdO1xuICAgICAgICAgICAgY2FsbGJhY2sobm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5WaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXIucHJvdG90eXBlLmdldE1vZGVsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHJldHVybiB7XG4gICAgICAgIGdldFZpcnR1YWxSb3c6IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhhdC5nZXRWaXJ0dWFsUm93KGluZGV4KTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VmlydHVhbFJvd0NvdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGF0LnZpcnR1YWxSb3dDb3VudDtcbiAgICAgICAgfSxcbiAgICAgICAgZm9yRWFjaEluTWVtb3J5OiBmdW5jdGlvbiggY2FsbGJhY2sgKSB7XG4gICAgICAgICAgICB0aGF0LmZvckVhY2hJbk1lbW9yeShjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsUGFnZVJvd0NvbnRyb2xsZXI7XG4iLCJ2YXIgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBncm91cENlbGxSZW5kZXJlckZhY3RvcnkgPSByZXF1aXJlKCcuL2NlbGxSZW5kZXJlcnMvZ3JvdXBDZWxsUmVuZGVyZXJGYWN0b3J5Jyk7XG5cbmZ1bmN0aW9uIFJvd1JlbmRlcmVyKCkge31cblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihncmlkT3B0aW9ucywgY29sdW1uTW9kZWwsIGdyaWRPcHRpb25zV3JhcHBlciwgZ3JpZFBhbmVsLFxuICAgIGFuZ3VsYXJHcmlkLCBzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnksICRjb21waWxlLCAkc2NvcGUsXG4gICAgc2VsZWN0aW9uQ29udHJvbGxlciwgZXhwcmVzc2lvblNlcnZpY2UsIHRlbXBsYXRlU2VydmljZSkge1xuICAgIHRoaXMuZ3JpZE9wdGlvbnMgPSBncmlkT3B0aW9ucztcbiAgICB0aGlzLmNvbHVtbk1vZGVsID0gY29sdW1uTW9kZWw7XG4gICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIgPSBncmlkT3B0aW9uc1dyYXBwZXI7XG4gICAgdGhpcy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkO1xuICAgIHRoaXMuc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5ID0gc2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5O1xuICAgIHRoaXMuZ3JpZFBhbmVsID0gZ3JpZFBhbmVsO1xuICAgIHRoaXMuJGNvbXBpbGUgPSAkY29tcGlsZTtcbiAgICB0aGlzLiRzY29wZSA9ICRzY29wZTtcbiAgICB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIgPSBzZWxlY3Rpb25Db250cm9sbGVyO1xuICAgIHRoaXMuZXhwcmVzc2lvblNlcnZpY2UgPSBleHByZXNzaW9uU2VydmljZTtcbiAgICB0aGlzLnRlbXBsYXRlU2VydmljZSA9IHRlbXBsYXRlU2VydmljZTtcbiAgICB0aGlzLmZpbmRBbGxFbGVtZW50cyhncmlkUGFuZWwpO1xuXG4gICAgdGhpcy5jZWxsUmVuZGVyZXJNYXAgPSB7XG4gICAgICAgICdncm91cCc6IGdyb3VwQ2VsbFJlbmRlcmVyRmFjdG9yeShncmlkT3B0aW9uc1dyYXBwZXIsIHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSlcbiAgICB9O1xuXG4gICAgLy8gbWFwIG9mIHJvdyBpZHMgdG8gcm93IG9iamVjdHMuIGtlZXBzIHRyYWNrIG9mIHdoaWNoIGVsZW1lbnRzXG4gICAgLy8gYXJlIHJlbmRlcmVkIGZvciB3aGljaCByb3dzIGluIHRoZSBkb20uIGVhY2ggcm93IG9iamVjdCBoYXM6XG4gICAgLy8gW3Njb3BlLCBib2R5Um93LCBwaW5uZWRSb3csIHJvd0RhdGFdXG4gICAgdGhpcy5yZW5kZXJlZFJvd3MgPSB7fTtcblxuICAgIHRoaXMucmVuZGVyZWRSb3dTdGFydEVkaXRpbmdMaXN0ZW5lcnMgPSB7fTtcblxuICAgIHRoaXMuZWRpdGluZ0NlbGwgPSBmYWxzZTsgLy9nZXRzIHNldCB0byB0cnVlIHdoZW4gZWRpdGluZyBhIGNlbGxcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zZXRSb3dNb2RlbCA9IGZ1bmN0aW9uKHJvd01vZGVsKSB7XG4gICAgdGhpcy5yb3dNb2RlbCA9IHJvd01vZGVsO1xufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLnNldE1haW5Sb3dXaWR0aHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbWFpblJvd1dpZHRoID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXRCb2R5Q29udGFpbmVyV2lkdGgoKSArIFwicHhcIjtcblxuICAgIHZhciB1bnBpbm5lZFJvd3MgPSB0aGlzLmVCb2R5Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuYWctcm93XCIpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdW5waW5uZWRSb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHVucGlubmVkUm93c1tpXS5zdHlsZS53aWR0aCA9IG1haW5Sb3dXaWR0aDtcbiAgICB9XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZmluZEFsbEVsZW1lbnRzID0gZnVuY3Rpb24oZ3JpZFBhbmVsKSB7XG4gICAgdGhpcy5lQm9keUNvbnRhaW5lciA9IGdyaWRQYW5lbC5nZXRCb2R5Q29udGFpbmVyKCk7XG4gICAgdGhpcy5lQm9keVZpZXdwb3J0ID0gZ3JpZFBhbmVsLmdldEJvZHlWaWV3cG9ydCgpO1xuICAgIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXIgPSBncmlkUGFuZWwuZ2V0UGlubmVkQ29sc0NvbnRhaW5lcigpO1xuICAgIHRoaXMuZVBhcmVudE9mUm93cyA9IGdyaWRQYW5lbC5nZXRSb3dzUGFyZW50KCk7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVmcmVzaFZpZXcgPSBmdW5jdGlvbihyZWZyZXNoRnJvbUluZGV4KSB7XG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0RvbnRVc2VTY3JvbGxzKCkpIHtcbiAgICAgICAgdmFyIHJvd0NvdW50ID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93Q291bnQoKTtcbiAgICAgICAgdmFyIGNvbnRhaW5lckhlaWdodCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0hlaWdodCgpICogcm93Q291bnQ7XG4gICAgICAgIHRoaXMuZUJvZHlDb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gY29udGFpbmVySGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICB0aGlzLmVQaW5uZWRDb2xzQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IGNvbnRhaW5lckhlaWdodCArIFwicHhcIjtcbiAgICB9XG5cbiAgICB0aGlzLnJlZnJlc2hBbGxWaXJ0dWFsUm93cyhyZWZyZXNoRnJvbUluZGV4KTtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zb2Z0UmVmcmVzaFZpZXcgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBmaXJzdCA9IHRoaXMuZmlyc3RWaXJ0dWFsUmVuZGVyZWRSb3c7XG4gICAgdmFyIGxhc3QgPSB0aGlzLmxhc3RWaXJ0dWFsUmVuZGVyZWRSb3c7XG5cbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheWVkQ29sdW1ucygpO1xuICAgIC8vIGlmIG5vIGNvbHMsIGRvbid0IGRyYXcgcm93XG4gICAgaWYgKCFjb2x1bW5zIHx8IGNvbHVtbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKHZhciByb3dJbmRleCA9IGZpcnN0OyByb3dJbmRleCA8PSBsYXN0OyByb3dJbmRleCsrKSB7XG4gICAgICAgIHZhciBub2RlID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93KHJvd0luZGV4KTtcbiAgICAgICAgaWYgKG5vZGUpIHtcblxuICAgICAgICAgICAgZm9yICh2YXIgY29sSW5kZXggPSAwOyBjb2xJbmRleCA8IGNvbHVtbnMubGVuZ3RoOyBjb2xJbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbHVtbiA9IGNvbHVtbnNbY29sSW5kZXhdO1xuICAgICAgICAgICAgICAgIHZhciByZW5kZXJlZFJvdyA9IHRoaXMucmVuZGVyZWRSb3dzW3Jvd0luZGV4XTtcbiAgICAgICAgICAgICAgICB2YXIgZUdyaWRDZWxsID0gcmVuZGVyZWRSb3cuZVZvbGF0aWxlQ2VsbHNbY29sdW1uLmNvbElkXTtcblxuICAgICAgICAgICAgICAgIGlmICghZUdyaWRDZWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBpc0ZpcnN0Q29sdW1uID0gY29sSW5kZXggPT09IDA7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gcmVuZGVyZWRSb3cuc2NvcGU7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNvZnRSZWZyZXNoQ2VsbChlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgc2NvcGUsIHJvd0luZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zb2Z0UmVmcmVzaENlbGwgPSBmdW5jdGlvbihlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgc2NvcGUsIHJvd0luZGV4KSB7XG5cbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbihlR3JpZENlbGwpO1xuXG4gICAgdmFyIGRhdGEgPSB0aGlzLmdldERhdGFGb3JOb2RlKG5vZGUpO1xuICAgIHZhciB2YWx1ZUdldHRlciA9IHRoaXMuY3JlYXRlVmFsdWVHZXR0ZXIoZGF0YSwgY29sdW1uLmNvbERlZiwgbm9kZSk7XG5cbiAgICB2YXIgdmFsdWU7XG4gICAgaWYgKHZhbHVlR2V0dGVyKSB7XG4gICAgICAgIHZhbHVlID0gdmFsdWVHZXR0ZXIoKTtcbiAgICB9XG5cbiAgICB0aGlzLnBvcHVsYXRlQW5kU3R5bGVHcmlkQ2VsbCh2YWx1ZUdldHRlciwgdmFsdWUsIGVHcmlkQ2VsbCwgaXNGaXJzdENvbHVtbiwgbm9kZSwgY29sdW1uLCByb3dJbmRleCwgc2NvcGUpO1xuXG4gICAgLy8gaWYgYW5ndWxhciBjb21waWxpbmcsIHRoZW4gbmVlZCB0byBhbHNvIGNvbXBpbGUgdGhlIGNlbGwgYWdhaW4gKGFuZ3VsYXIgY29tcGlsaW5nIHN1Y2tzLCBwbGVhc2Ugd2FpdC4uLilcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZVJvd3MoKSkge1xuICAgICAgICB0aGlzLiRjb21waWxlKGVHcmlkQ2VsbCkoc2NvcGUpO1xuICAgIH1cbn07XG5cbi8vIEhCIGFkZGl0aW9uXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucmVmcmVzaEJ5Um93Q29sdW1uID0gZnVuY3Rpb24ocm93SW5kZXgsIGNvbHVtbkluZGV4KSB7XG4gICAgdmFyIHJlbmRlcmVkUm93ID0gdGhpcy5yZW5kZXJlZFJvd3Nbcm93SW5kZXhdO1xuICAgIGlmIChyZW5kZXJlZFJvdykge1xuICAgICAgICB2YXIgY29sdW1uID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXRBbGxDb2x1bW5zKClbY29sdW1uSW5kZXhdO1xuICAgICAgICB2YXIgZUdyaWRDZWxsID0gcmVuZGVyZWRSb3cuZUNlbGxzW2NvbHVtbi5jb2xLZXldO1xuICAgICAgICB0aGlzLnNvZnRSZWZyZXNoQ2VsbChlR3JpZENlbGwsIGNvbHVtbkluZGV4ID09IDAsIHJlbmRlcmVkUm93Lm5vZGUsIGNvbHVtbiwgcm93SW5kZXgsIG51bGwpO1xuICAgIH1cbn07XG5cbi8vIEhCIGFkZGl0aW9uXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZWRpdENlbGxBdFJvd0NvbHVtbiA9IGZ1bmN0aW9uKHJvd0luZGV4LCBjb2x1bW5JbmRleCkge1xuICAgIHJldHVybiB0aGlzLnJlbmRlcmVkUm93U3RhcnRFZGl0aW5nTGlzdGVuZXJzW3Jvd0luZGV4XVtjb2x1bW5JbmRleF0oKTtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yb3dEYXRhQ2hhbmdlZCA9IGZ1bmN0aW9uKHJvd3MpIHtcbiAgICAvLyB3ZSBvbmx5IG5lZWQgdG8gYmUgd29ycmllZCBhYm91dCByZW5kZXJlZCByb3dzLCBhcyB0aGlzIG1ldGhvZCBpc1xuICAgIC8vIGNhbGxlZCB0byB3aGF0cyByZW5kZXJlZC4gaWYgdGhlIHJvdyBpc24ndCByZW5kZXJlZCwgd2UgZG9uJ3QgY2FyZVxuICAgIHZhciBpbmRleGVzVG9SZW1vdmUgPSBbXTtcbiAgICB2YXIgcmVuZGVyZWRSb3dzID0gdGhpcy5yZW5kZXJlZFJvd3M7XG4gICAgT2JqZWN0LmtleXMocmVuZGVyZWRSb3dzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgcmVuZGVyZWRSb3cgPSByZW5kZXJlZFJvd3Nba2V5XTtcbiAgICAgICAgLy8gc2VlIGlmIHRoZSByZW5kZXJlZCByb3cgaXMgaW4gdGhlIGxpc3Qgb2Ygcm93cyB3ZSBoYXZlIHRvIHVwZGF0ZVxuICAgICAgICB2YXIgcm93TmVlZHNVcGRhdGluZyA9IHJvd3MuaW5kZXhPZihyZW5kZXJlZFJvdy5ub2RlLmRhdGEpID49IDA7XG4gICAgICAgIGlmIChyb3dOZWVkc1VwZGF0aW5nKSB7XG4gICAgICAgICAgICBpbmRleGVzVG9SZW1vdmUucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gcmVtb3ZlIHRoZSByb3dzXG4gICAgdGhpcy5yZW1vdmVWaXJ0dWFsUm93cyhpbmRleGVzVG9SZW1vdmUpO1xuICAgIC8vIGFkZCBkcmF3IHRoZW0gYWdhaW5cbiAgICB0aGlzLmRyYXdWaXJ0dWFsUm93cygpO1xufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLnJlZnJlc2hBbGxWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKGZyb21JbmRleCkge1xuICAgIC8vIHJlbW92ZSBhbGwgY3VycmVudCB2aXJ0dWFsIHJvd3MsIGFzIHRoZXkgaGF2ZSBvbGQgZGF0YVxuICAgIHZhciByb3dzVG9SZW1vdmUgPSBPYmplY3Qua2V5cyh0aGlzLnJlbmRlcmVkUm93cyk7XG4gICAgdGhpcy5yZW1vdmVWaXJ0dWFsUm93cyhyb3dzVG9SZW1vdmUsIGZyb21JbmRleCk7XG5cbiAgICAvLyBhZGQgaW4gbmV3IHJvd3NcbiAgICB0aGlzLmRyYXdWaXJ0dWFsUm93cygpO1xufTtcblxuLy8gcHVibGljIC0gcmVtb3ZlcyB0aGUgZ3JvdXAgcm93cyBhbmQgdGhlbiByZWRyYXdzIHRoZW0gYWdhaW5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yZWZyZXNoR3JvdXBSb3dzID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gZmluZCBhbGwgdGhlIGdyb3VwIHJvd3NcbiAgICB2YXIgcm93c1RvUmVtb3ZlID0gW107XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIE9iamVjdC5rZXlzKHRoaXMucmVuZGVyZWRSb3dzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgcmVuZGVyZWRSb3cgPSB0aGF0LnJlbmRlcmVkUm93c1trZXldO1xuICAgICAgICB2YXIgbm9kZSA9IHJlbmRlcmVkUm93Lm5vZGU7XG4gICAgICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgICAgICByb3dzVG9SZW1vdmUucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gcmVtb3ZlIHRoZSByb3dzXG4gICAgdGhpcy5yZW1vdmVWaXJ0dWFsUm93cyhyb3dzVG9SZW1vdmUpO1xuICAgIC8vIGFuZCBkcmF3IHRoZW0gYmFjayBhZ2FpblxuICAgIHRoaXMuZW5zdXJlUm93c1JlbmRlcmVkKCk7XG59O1xuXG4vLyB0YWtlcyBhcnJheSBvZiByb3cgaW5kZXhlc1xuUm93UmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZVZpcnR1YWxSb3dzID0gZnVuY3Rpb24ocm93c1RvUmVtb3ZlLCBmcm9tSW5kZXgpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgLy8gaWYgbm8gZnJvbUluZGV4IHRoZW4gc2V0IHRvIC0xLCB3aGljaCB3aWxsIHJlZnJlc2ggZXZlcnl0aGluZ1xuICAgIHZhciByZWFsRnJvbUluZGV4ID0gKHR5cGVvZiBmcm9tSW5kZXggPT09ICdudW1iZXInKSA/IGZyb21JbmRleCA6IC0xO1xuICAgIHJvd3NUb1JlbW92ZS5mb3JFYWNoKGZ1bmN0aW9uKGluZGV4VG9SZW1vdmUpIHtcbiAgICAgICAgaWYgKGluZGV4VG9SZW1vdmUgPj0gcmVhbEZyb21JbmRleCkge1xuICAgICAgICAgICAgdGhhdC5yZW1vdmVWaXJ0dWFsUm93KGluZGV4VG9SZW1vdmUpO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGUgcm93IHdhcyBsYXN0IHRvIGhhdmUgZm9jdXMsIHdlIHJlbW92ZSB0aGUgZmFjdCB0aGF0IGl0IGhhcyBmb2N1c1xuICAgICAgICAgICAgaWYgKHRoYXQuZm9jdXNlZENlbGwgJiYgdGhhdC5mb2N1c2VkQ2VsbC5yb3dJbmRleCA9PSBpbmRleFRvUmVtb3ZlKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5mb2N1c2VkQ2VsbCA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmVWaXJ0dWFsUm93ID0gZnVuY3Rpb24oaW5kZXhUb1JlbW92ZSkge1xuICAgIHZhciByZW5kZXJlZFJvdyA9IHRoaXMucmVuZGVyZWRSb3dzW2luZGV4VG9SZW1vdmVdO1xuICAgIGlmIChyZW5kZXJlZFJvdy5waW5uZWRFbGVtZW50ICYmIHRoaXMuZVBpbm5lZENvbHNDb250YWluZXIpIHtcbiAgICAgICAgdGhpcy5lUGlubmVkQ29sc0NvbnRhaW5lci5yZW1vdmVDaGlsZChyZW5kZXJlZFJvdy5waW5uZWRFbGVtZW50KTtcbiAgICB9XG5cbiAgICBpZiAocmVuZGVyZWRSb3cuYm9keUVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5lQm9keUNvbnRhaW5lci5yZW1vdmVDaGlsZChyZW5kZXJlZFJvdy5ib2R5RWxlbWVudCk7XG4gICAgfVxuXG4gICAgaWYgKHJlbmRlcmVkUm93LnNjb3BlKSB7XG4gICAgICAgIHJlbmRlcmVkUm93LnNjb3BlLiRkZXN0cm95KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFZpcnR1YWxSb3dSZW1vdmVkKCkpIHtcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0VmlydHVhbFJvd1JlbW92ZWQoKShyZW5kZXJlZFJvdy5kYXRhLCBpbmRleFRvUmVtb3ZlKTtcbiAgICB9XG4gICAgdGhpcy5hbmd1bGFyR3JpZC5vblZpcnR1YWxSb3dSZW1vdmVkKGluZGV4VG9SZW1vdmUpO1xuXG4gICAgZGVsZXRlIHRoaXMucmVuZGVyZWRSb3dzW2luZGV4VG9SZW1vdmVdO1xuICAgIGRlbGV0ZSB0aGlzLnJlbmRlcmVkUm93U3RhcnRFZGl0aW5nTGlzdGVuZXJzW2luZGV4VG9SZW1vdmVdO1xufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmRyYXdWaXJ0dWFsUm93cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmaXJzdDtcbiAgICB2YXIgbGFzdDtcblxuICAgIHZhciByb3dDb3VudCA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvd0NvdW50KCk7XG5cbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNEb250VXNlU2Nyb2xscygpKSB7XG4gICAgICAgIGZpcnN0ID0gMDtcbiAgICAgICAgbGFzdCA9IHJvd0NvdW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciB0b3BQaXhlbCA9IHRoaXMuZUJvZHlWaWV3cG9ydC5zY3JvbGxUb3A7XG4gICAgICAgIHZhciBib3R0b21QaXhlbCA9IHRvcFBpeGVsICsgdGhpcy5lQm9keVZpZXdwb3J0Lm9mZnNldEhlaWdodDtcblxuICAgICAgICBmaXJzdCA9IE1hdGguZmxvb3IodG9wUGl4ZWwgLyB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dIZWlnaHQoKSk7XG4gICAgICAgIGxhc3QgPSBNYXRoLmZsb29yKGJvdHRvbVBpeGVsIC8gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93SGVpZ2h0KCkpO1xuXG4gICAgICAgIC8vYWRkIGluIGJ1ZmZlclxuICAgICAgICB2YXIgYnVmZmVyID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93QnVmZmVyKCkgfHwgY29uc3RhbnRzLlJPV19CVUZGRVJfU0laRTtcbiAgICAgICAgZmlyc3QgPSBmaXJzdCAtIGJ1ZmZlcjtcbiAgICAgICAgbGFzdCA9IGxhc3QgKyBidWZmZXI7XG5cbiAgICAgICAgLy8gYWRqdXN0LCBpbiBjYXNlIGJ1ZmZlciBleHRlbmRlZCBhY3R1YWwgc2l6ZVxuICAgICAgICBpZiAoZmlyc3QgPCAwKSB7XG4gICAgICAgICAgICBmaXJzdCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxhc3QgPiByb3dDb3VudCAtIDEpIHtcbiAgICAgICAgICAgIGxhc3QgPSByb3dDb3VudCAtIDE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmZpcnN0VmlydHVhbFJlbmRlcmVkUm93ID0gZmlyc3Q7XG4gICAgdGhpcy5sYXN0VmlydHVhbFJlbmRlcmVkUm93ID0gbGFzdDtcblxuICAgIHRoaXMuZW5zdXJlUm93c1JlbmRlcmVkKCk7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0Rmlyc3RWaXJ0dWFsUmVuZGVyZWRSb3cgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5maXJzdFZpcnR1YWxSZW5kZXJlZFJvdztcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRMYXN0VmlydHVhbFJlbmRlcmVkUm93ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubGFzdFZpcnR1YWxSZW5kZXJlZFJvdztcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5lbnN1cmVSb3dzUmVuZGVyZWQgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBtYWluUm93V2lkdGggPSB0aGlzLmNvbHVtbk1vZGVsLmdldEJvZHlDb250YWluZXJXaWR0aCgpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcm93c0luc2VydGVkID0gZmFsc2U7XG5cbiAgICAvLyBhdCB0aGUgZW5kLCB0aGlzIGFycmF5IHdpbGwgY29udGFpbiB0aGUgaXRlbXMgd2UgbmVlZCB0byByZW1vdmVcbiAgICB2YXIgcm93c1RvUmVtb3ZlID0gT2JqZWN0LmtleXModGhpcy5yZW5kZXJlZFJvd3MpO1xuXG4gICAgLy8gYWRkIGluIG5ldyByb3dzXG4gICAgZm9yICh2YXIgcm93SW5kZXggPSB0aGlzLmZpcnN0VmlydHVhbFJlbmRlcmVkUm93OyByb3dJbmRleCA8PSB0aGlzLmxhc3RWaXJ0dWFsUmVuZGVyZWRSb3c7IHJvd0luZGV4KyspIHtcbiAgICAgICAgLy8gc2VlIGlmIGl0ZW0gYWxyZWFkeSB0aGVyZSwgYW5kIGlmIHllcywgdGFrZSBpdCBvdXQgb2YgdGhlICd0byByZW1vdmUnIGFycmF5XG4gICAgICAgIGlmIChyb3dzVG9SZW1vdmUuaW5kZXhPZihyb3dJbmRleC50b1N0cmluZygpKSA+PSAwKSB7XG4gICAgICAgICAgICByb3dzVG9SZW1vdmUuc3BsaWNlKHJvd3NUb1JlbW92ZS5pbmRleE9mKHJvd0luZGV4LnRvU3RyaW5nKCkpLCAxKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGNoZWNrIHRoaXMgcm93IGFjdHVhbGx5IGV4aXN0cyAoaW4gY2FzZSBvdmVyZmxvdyBidWZmZXIgd2luZG93IGV4Y2VlZHMgcmVhbCBkYXRhKVxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvdyhyb3dJbmRleCk7XG4gICAgICAgIGlmIChub2RlKSB7XG4gICAgICAgICAgICB0aGF0Lmluc2VydFJvdyhub2RlLCByb3dJbmRleCwgbWFpblJvd1dpZHRoKTtcbiAgICAgICAgICAgIHJvd3NJbnNlcnRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBhdCB0aGlzIHBvaW50LCBldmVyeXRoaW5nIGluIG91ciAncm93c1RvUmVtb3ZlJyAuIC4gLlxuICAgIHRoaXMucmVtb3ZlVmlydHVhbFJvd3Mocm93c1RvUmVtb3ZlKTtcblxuICAgIHZhciBkb21Sb3dzQ2hhbmdlZEZuID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0RE9NUm93c0NoYW5nZWRIYW5kbGVyKCk7XG5cbiAgICAvL05vdGlmeSBvdXRzaWRlIHdvcmxkIHRoYXQgZG9tIHJvd3MgY2hhbmdlZC5cbiAgICBpZigocm93c0luc2VydGVkIHx8IHJvd3NUb1JlbW92ZS5sZW5ndGggPiAwKSAmJiBkb21Sb3dzQ2hhbmdlZEZuKXtcbiAgICAgICAgLy9nZXQgYWxsIGN1cnJlbnRseSByZW5kZXJlZCByb3dzIGluIGRvbS5cbiAgICAgICAgdmFyIHJvd3NJbkRPTSA9IFtdO1xuICAgICAgICBPYmplY3Qua2V5cyh0aGF0LnJlbmRlcmVkUm93cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJvd3NJbkRPTS5wdXNoKHRoYXQucmVuZGVyZWRSb3dzW2tleV0ubm9kZS5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGRvbVJvd3NDaGFuZ2VkRm4ocm93c0luRE9NKTtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBhcmUgZG9pbmcgYW5ndWxhciBjb21waWxpbmcsIHRoZW4gZG8gZGlnZXN0IHRoZSBzY29wZSBoZXJlXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzQW5ndWxhckNvbXBpbGVSb3dzKCkpIHtcbiAgICAgICAgLy8gd2UgZG8gaXQgaW4gYSB0aW1lb3V0LCBpbiBjYXNlIHdlIGFyZSBhbHJlYWR5IGluIGFuIGFwcGx5XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LiRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmluc2VydFJvdyA9IGZ1bmN0aW9uKG5vZGUsIHJvd0luZGV4LCBtYWluUm93V2lkdGgpIHtcbiAgICB2YXIgY29sdW1ucyA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheWVkQ29sdW1ucygpO1xuICAgIC8vIGlmIG5vIGNvbHMsIGRvbid0IGRyYXcgcm93XG4gICAgaWYgKCFjb2x1bW5zIHx8IGNvbHVtbnMubGVuZ3RoID09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHZhciByb3dEYXRhID0gbm9kZS5yb3dEYXRhO1xuICAgIHZhciByb3dJc0FHcm91cCA9IG5vZGUuZ3JvdXA7XG5cbiAgICAvLyB0cnkgY29tcGlsaW5nIGFzIHdlIGluc2VydCByb3dzXG4gICAgdmFyIG5ld0NoaWxkU2NvcGUgPSB0aGlzLmNyZWF0ZUNoaWxkU2NvcGVPck51bGwobm9kZS5kYXRhKTtcblxuICAgIHZhciBlUGlubmVkUm93ID0gdGhpcy5jcmVhdGVSb3dDb250YWluZXIocm93SW5kZXgsIG5vZGUsIHJvd0lzQUdyb3VwLCBuZXdDaGlsZFNjb3BlKTtcbiAgICB2YXIgZU1haW5Sb3cgPSB0aGlzLmNyZWF0ZVJvd0NvbnRhaW5lcihyb3dJbmRleCwgbm9kZSwgcm93SXNBR3JvdXAsIG5ld0NoaWxkU2NvcGUpO1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIGVNYWluUm93LnN0eWxlLndpZHRoID0gbWFpblJvd1dpZHRoICsgXCJweFwiO1xuXG4gICAgdmFyIHJlbmRlcmVkUm93ID0ge1xuICAgICAgICBzY29wZTogbmV3Q2hpbGRTY29wZSxcbiAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxuICAgICAgICBlQ2VsbHM6IHt9LFxuICAgICAgICBlVm9sYXRpbGVDZWxsczoge31cbiAgICB9O1xuICAgIHRoaXMucmVuZGVyZWRSb3dzW3Jvd0luZGV4XSA9IHJlbmRlcmVkUm93O1xuICAgIHRoaXMucmVuZGVyZWRSb3dTdGFydEVkaXRpbmdMaXN0ZW5lcnNbcm93SW5kZXhdID0ge307XG5cbiAgICAvLyBpZiBncm91cCBpdGVtLCBpbnNlcnQgdGhlIGZpcnN0IHJvd1xuICAgIHZhciBncm91cEhlYWRlclRha2VzRW50aXJlUm93ID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFVzZUVudGlyZVJvdygpO1xuICAgIHZhciBkcmF3R3JvdXBSb3cgPSByb3dJc0FHcm91cCAmJiBncm91cEhlYWRlclRha2VzRW50aXJlUm93O1xuXG4gICAgaWYgKGRyYXdHcm91cFJvdykge1xuICAgICAgICB2YXIgZmlyc3RDb2x1bW4gPSBjb2x1bW5zWzBdO1xuXG4gICAgICAgIHZhciBlR3JvdXBSb3cgPSB0aGF0LmNyZWF0ZUdyb3VwRWxlbWVudChub2RlLCByb3dJbmRleCwgZmFsc2UpO1xuICAgICAgICBpZiAoZmlyc3RDb2x1bW4ucGlubmVkKSB7XG4gICAgICAgICAgICBlUGlubmVkUm93LmFwcGVuZENoaWxkKGVHcm91cFJvdyk7XG5cbiAgICAgICAgICAgIHZhciBlR3JvdXBSb3dQYWRkaW5nID0gdGhhdC5jcmVhdGVHcm91cEVsZW1lbnQobm9kZSwgcm93SW5kZXgsIHRydWUpO1xuICAgICAgICAgICAgZU1haW5Sb3cuYXBwZW5kQ2hpbGQoZUdyb3VwUm93UGFkZGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlTWFpblJvdy5hcHBlbmRDaGlsZChlR3JvdXBSb3cpO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICAgIGNvbHVtbnMuZm9yRWFjaChmdW5jdGlvbihjb2x1bW4sIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgZmlyc3RDb2wgPSBpbmRleCA9PT0gMDtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhhdC5nZXREYXRhRm9yTm9kZShub2RlKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZUdldHRlciA9IHRoYXQuY3JlYXRlVmFsdWVHZXR0ZXIoZGF0YSwgY29sdW1uLmNvbERlZiwgbm9kZSk7XG4gICAgICAgICAgICB0aGF0LmNyZWF0ZUNlbGxGcm9tQ29sRGVmKGZpcnN0Q29sLCBjb2x1bW4sIHZhbHVlR2V0dGVyLCBub2RlLCByb3dJbmRleCwgZU1haW5Sb3csIGVQaW5uZWRSb3csIG5ld0NoaWxkU2NvcGUsIHJlbmRlcmVkUm93KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy90cnkgY29tcGlsaW5nIGFzIHdlIGluc2VydCByb3dzXG4gICAgcmVuZGVyZWRSb3cucGlubmVkRWxlbWVudCA9IHRoaXMuY29tcGlsZUFuZEFkZCh0aGlzLmVQaW5uZWRDb2xzQ29udGFpbmVyLCByb3dJbmRleCwgZVBpbm5lZFJvdywgbmV3Q2hpbGRTY29wZSk7XG4gICAgcmVuZGVyZWRSb3cuYm9keUVsZW1lbnQgPSB0aGlzLmNvbXBpbGVBbmRBZGQodGhpcy5lQm9keUNvbnRhaW5lciwgcm93SW5kZXgsIGVNYWluUm93LCBuZXdDaGlsZFNjb3BlKTtcbn07XG5cbi8vIGlmIGdyb3VwIGlzIGEgZm9vdGVyLCBhbHdheXMgc2hvdyB0aGUgZGF0YS5cbi8vIGlmIGdyb3VwIGlzIGEgaGVhZGVyLCBvbmx5IHNob3cgZGF0YSBpZiBub3QgZXhwYW5kZWRcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXREYXRhRm9yTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZS5mb290ZXIpIHtcbiAgICAgICAgLy8gaWYgZm9vdGVyLCB3ZSBhbHdheXMgc2hvdyB0aGUgZGF0YVxuICAgICAgICByZXR1cm4gbm9kZS5kYXRhO1xuICAgIH0gZWxzZSBpZiAobm9kZS5ncm91cCkge1xuICAgICAgICAvLyBpZiBoZWFkZXIgYW5kIGhlYWRlciBpcyBleHBhbmRlZCwgd2Ugc2hvdyBkYXRhIGluIGZvb3RlciBvbmx5XG4gICAgICAgIHZhciBmb290ZXJzRW5hYmxlZCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBJbmNsdWRlRm9vdGVyKCk7XG4gICAgICAgIHJldHVybiAobm9kZS5leHBhbmRlZCAmJiBmb290ZXJzRW5hYmxlZCkgPyB1bmRlZmluZWQgOiBub2RlLmRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIGl0J3MgYSBub3JtYWwgbm9kZSwganVzdCByZXR1cm4gZGF0YSBhcyBub3JtYWxcbiAgICAgICAgcmV0dXJuIG5vZGUuZGF0YTtcbiAgICB9XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlVmFsdWVHZXR0ZXIgPSBmdW5jdGlvbihkYXRhLCBjb2xEZWYsIG5vZGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXBpID0gdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCk7XG4gICAgICAgIHZhciBjb250ZXh0ID0gdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpO1xuICAgICAgICByZXR1cm4gdXRpbHMuZ2V0VmFsdWUodGhhdC5leHByZXNzaW9uU2VydmljZSwgZGF0YSwgY29sRGVmLCBub2RlLCBhcGksIGNvbnRleHQpO1xuICAgIH07XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlQ2hpbGRTY29wZU9yTnVsbCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNBbmd1bGFyQ29tcGlsZVJvd3MoKSkge1xuICAgICAgICB2YXIgbmV3Q2hpbGRTY29wZSA9IHRoaXMuJHNjb3BlLiRuZXcoKTtcbiAgICAgICAgbmV3Q2hpbGRTY29wZS5kYXRhID0gZGF0YTtcbiAgICAgICAgcmV0dXJuIG5ld0NoaWxkU2NvcGU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmNvbXBpbGVBbmRBZGQgPSBmdW5jdGlvbihjb250YWluZXIsIHJvd0luZGV4LCBlbGVtZW50LCBzY29wZSkge1xuICAgIGlmIChzY29wZSkge1xuICAgICAgICB2YXIgZUVsZW1lbnRDb21waWxlZCA9IHRoaXMuJGNvbXBpbGUoZWxlbWVudCkoc2NvcGUpO1xuICAgICAgICBpZiAoY29udGFpbmVyKSB7IC8vIGNoZWNraW5nIGNvbnRhaW5lciwgYXMgaWYgbm9TY3JvbGwsIHBpbm5lZCBjb250YWluZXIgaXMgbWlzc2luZ1xuICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGVFbGVtZW50Q29tcGlsZWRbMF0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlRWxlbWVudENvbXBpbGVkWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlQ2VsbEZyb21Db2xEZWYgPSBmdW5jdGlvbihpc0ZpcnN0Q29sdW1uLCBjb2x1bW4sIHZhbHVlR2V0dGVyLCBub2RlLCByb3dJbmRleCwgZU1haW5Sb3csIGVQaW5uZWRSb3csICRjaGlsZFNjb3BlLCByZW5kZXJlZFJvdykge1xuICAgIHZhciBlR3JpZENlbGwgPSB0aGlzLmNyZWF0ZUNlbGwoaXNGaXJzdENvbHVtbiwgY29sdW1uLCB2YWx1ZUdldHRlciwgbm9kZSwgcm93SW5kZXgsICRjaGlsZFNjb3BlKTtcblxuICAgIGlmIChjb2x1bW4uY29sRGVmLnZvbGF0aWxlKSB7XG4gICAgICAgIHJlbmRlcmVkUm93LmVWb2xhdGlsZUNlbGxzW2NvbHVtbi5jb2xJZF0gPSBlR3JpZENlbGw7XG4gICAgfVxuICAgIHJlbmRlcmVkUm93LmVDZWxsc1tjb2x1bW4uY29sSWRdID0gZUdyaWRDZWxsO1xuXG4gICAgaWYgKGNvbHVtbi5waW5uZWQpIHtcbiAgICAgICAgZVBpbm5lZFJvdy5hcHBlbmRDaGlsZChlR3JpZENlbGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVNYWluUm93LmFwcGVuZENoaWxkKGVHcmlkQ2VsbCk7XG4gICAgfVxufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENsYXNzZXNUb1JvdyA9IGZ1bmN0aW9uKHJvd0luZGV4LCBub2RlLCBlUm93KSB7XG4gICAgdmFyIGNsYXNzZXNMaXN0ID0gW1wiYWctcm93XCJdO1xuICAgIGNsYXNzZXNMaXN0LnB1c2gocm93SW5kZXggJSAyID09IDAgPyBcImFnLXJvdy1ldmVuXCIgOiBcImFnLXJvdy1vZGRcIik7XG5cbiAgICBpZiAodGhpcy5zZWxlY3Rpb25Db250cm9sbGVyLmlzTm9kZVNlbGVjdGVkKG5vZGUpKSB7XG4gICAgICAgIGNsYXNzZXNMaXN0LnB1c2goXCJhZy1yb3ctc2VsZWN0ZWRcIik7XG4gICAgfVxuICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgIC8vIGlmIGEgZ3JvdXAsIHB1dCB0aGUgbGV2ZWwgb2YgdGhlIGdyb3VwIGluXG4gICAgICAgIGNsYXNzZXNMaXN0LnB1c2goXCJhZy1yb3ctbGV2ZWwtXCIgKyBub2RlLmxldmVsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiBhIGxlYWYsIGFuZCBhIHBhcmVudCBleGlzdHMsIHB1dCBhIGxldmVsIG9mIHRoZSBwYXJlbnQsIGVsc2UgcHV0IGxldmVsIG9mIDAgZm9yIHRvcCBsZXZlbCBpdGVtXG4gICAgICAgIGlmIChub2RlLnBhcmVudCkge1xuICAgICAgICAgICAgY2xhc3Nlc0xpc3QucHVzaChcImFnLXJvdy1sZXZlbC1cIiArIChub2RlLnBhcmVudC5sZXZlbCArIDEpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsYXNzZXNMaXN0LnB1c2goXCJhZy1yb3ctbGV2ZWwtMFwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAobm9kZS5ncm91cCkge1xuICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWdyb3VwXCIpO1xuICAgIH1cbiAgICBpZiAobm9kZS5ncm91cCAmJiAhbm9kZS5mb290ZXIgJiYgbm9kZS5leHBhbmRlZCkge1xuICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWdyb3VwLWV4cGFuZGVkXCIpO1xuICAgIH1cbiAgICBpZiAobm9kZS5ncm91cCAmJiAhbm9kZS5mb290ZXIgJiYgIW5vZGUuZXhwYW5kZWQpIHtcbiAgICAgICAgLy8gb3Bwb3NpdGUgb2YgZXhwYW5kZWQgaXMgY29udHJhY3RlZCBhY2NvcmRpbmcgdG8gdGhlIGludGVybmV0LlxuICAgICAgICBjbGFzc2VzTGlzdC5wdXNoKFwiYWctcm93LWdyb3VwLWNvbnRyYWN0ZWRcIik7XG4gICAgfVxuICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuZm9vdGVyKSB7XG4gICAgICAgIGNsYXNzZXNMaXN0LnB1c2goXCJhZy1yb3ctZm9vdGVyXCIpO1xuICAgIH1cblxuICAgIC8vIGFkZCBpbiBleHRyYSBjbGFzc2VzIHByb3ZpZGVkIGJ5IHRoZSBjb25maWdcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93Q2xhc3MoKSkge1xuICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcbiAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgIGNvbnRleHQ6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKSxcbiAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGV4dHJhUm93Q2xhc3NlcyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd0NsYXNzKCkocGFyYW1zKTtcbiAgICAgICAgaWYgKGV4dHJhUm93Q2xhc3Nlcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYVJvd0NsYXNzZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgY2xhc3Nlc0xpc3QucHVzaChleHRyYVJvd0NsYXNzZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGV4dHJhUm93Q2xhc3NlcykpIHtcbiAgICAgICAgICAgICAgICBleHRyYVJvd0NsYXNzZXMuZm9yRWFjaChmdW5jdGlvbihjbGFzc0l0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3Nlc0xpc3QucHVzaChjbGFzc0l0ZW0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGNsYXNzZXMgPSBjbGFzc2VzTGlzdC5qb2luKFwiIFwiKTtcblxuICAgIGVSb3cuY2xhc3NOYW1lID0gY2xhc3Nlcztcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVSb3dDb250YWluZXIgPSBmdW5jdGlvbihyb3dJbmRleCwgbm9kZSwgZ3JvdXBSb3csICRzY29wZSkge1xuICAgIHZhciBlUm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblxuICAgIHRoaXMuYWRkQ2xhc3Nlc1RvUm93KHJvd0luZGV4LCBub2RlLCBlUm93KTtcblxuICAgIGVSb3cuc2V0QXR0cmlidXRlKCdyb3cnLCByb3dJbmRleCk7XG5cbiAgICAvLyBpZiBzaG93aW5nIHNjcm9sbHMsIHBvc2l0aW9uIG9uIHRoZSBjb250YWluZXJcbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzRG9udFVzZVNjcm9sbHMoKSkge1xuICAgICAgICBlUm93LnN0eWxlLnRvcCA9ICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dIZWlnaHQoKSAqIHJvd0luZGV4KSArIFwicHhcIjtcbiAgICB9XG4gICAgZVJvdy5zdHlsZS5oZWlnaHQgPSAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93SGVpZ2h0KCkpICsgXCJweFwiO1xuXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldFJvd1N0eWxlKCkpIHtcbiAgICAgICAgdmFyIGNzc1RvVXNlO1xuICAgICAgICB2YXIgcm93U3R5bGUgPSB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dTdHlsZSgpO1xuICAgICAgICBpZiAodHlwZW9mIHJvd1N0eWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCksXG4gICAgICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpLFxuICAgICAgICAgICAgICAgICRzY29wZTogJHNjb3BlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY3NzVG9Vc2UgPSByb3dTdHlsZShwYXJhbXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3NzVG9Vc2UgPSByb3dTdHlsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjc3NUb1VzZSkge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoY3NzVG9Vc2UpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICAgICAgZVJvdy5zdHlsZVtrZXldID0gY3NzVG9Vc2Vba2V5XTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBlUm93LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBfdGhpcy5hbmd1bGFyR3JpZC5vblJvd0NsaWNrZWQoZXZlbnQsIE51bWJlcih0aGlzLmdldEF0dHJpYnV0ZShcInJvd1wiKSksIG5vZGUpXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZVJvdztcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRJbmRleE9mUmVuZGVyZWROb2RlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciByZW5kZXJlZFJvd3MgPSB0aGlzLnJlbmRlcmVkUm93cztcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJlbmRlcmVkUm93cyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChyZW5kZXJlZFJvd3Nba2V5c1tpXV0ubm9kZSA9PT0gbm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVkUm93c1trZXlzW2ldXS5yb3dJbmRleDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlR3JvdXBFbGVtZW50ID0gZnVuY3Rpb24obm9kZSwgcm93SW5kZXgsIHBhZGRpbmcpIHtcbiAgICB2YXIgZVJvdztcbiAgICAvLyBwYWRkaW5nIG1lYW5zIHdlIGFyZSBvbiB0aGUgcmlnaHQgaGFuZCBzaWRlIG9mIGEgcGlubmVkIHRhYmxlLCBpZVxuICAgIC8vIGluIHRoZSBtYWluIGJvZHkuXG4gICAgaWYgKHBhZGRpbmcpIHtcbiAgICAgICAgZVJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcbiAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCksXG4gICAgICAgICAgICBjb2xEZWY6IHtcbiAgICAgICAgICAgICAgICBjZWxsUmVuZGVyZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyZXI6ICdncm91cCcsXG4gICAgICAgICAgICAgICAgICAgIGlubmVyUmVuZGVyZXI6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEdyb3VwUm93SW5uZXJSZW5kZXJlcigpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBlUm93ID0gdGhpcy5jZWxsUmVuZGVyZXJNYXBbJ2dyb3VwJ10ocGFyYW1zKTtcbiAgICB9XG5cbiAgICBpZiAobm9kZS5mb290ZXIpIHtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVJvdywgJ2FnLWZvb3Rlci1jZWxsLWVudGlyZS1yb3cnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB1dGlscy5hZGRDc3NDbGFzcyhlUm93LCAnYWctZ3JvdXAtY2VsbC1lbnRpcmUtcm93Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVSb3c7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUucHV0RGF0YUludG9DZWxsID0gZnVuY3Rpb24oY29sdW1uLCB2YWx1ZSwgdmFsdWVHZXR0ZXIsIG5vZGUsICRjaGlsZFNjb3BlLCBlU3BhbldpdGhWYWx1ZSwgZUdyaWRDZWxsLCByb3dJbmRleCwgcmVmcmVzaENlbGxGdW5jdGlvbikge1xuICAgIC8vIHRlbXBsYXRlIGdldHMgcHJlZmVyZW5jZSwgdGhlbiBjZWxsUmVuZGVyZXIsIHRoZW4gZG8gaXQgb3Vyc2VsdmVzXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XG4gICAgaWYgKGNvbERlZi50ZW1wbGF0ZSkge1xuICAgICAgICBlU3BhbldpdGhWYWx1ZS5pbm5lckhUTUwgPSBjb2xEZWYudGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmIChjb2xEZWYudGVtcGxhdGVVcmwpIHtcbiAgICAgICAgdmFyIHRlbXBsYXRlID0gdGhpcy50ZW1wbGF0ZVNlcnZpY2UuZ2V0VGVtcGxhdGUoY29sRGVmLnRlbXBsYXRlVXJsLCByZWZyZXNoQ2VsbEZ1bmN0aW9uKTtcbiAgICAgICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgICAgICBlU3BhbldpdGhWYWx1ZS5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29sRGVmLmNlbGxSZW5kZXJlcikge1xuICAgICAgICB0aGlzLnVzZUNlbGxSZW5kZXJlcihjb2x1bW4sIHZhbHVlLCBub2RlLCAkY2hpbGRTY29wZSwgZVNwYW5XaXRoVmFsdWUsIHJvd0luZGV4LCByZWZyZXNoQ2VsbEZ1bmN0aW9uLCB2YWx1ZUdldHRlciwgZUdyaWRDZWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSBpbnNlcnQgdW5kZWZpbmVkLCB0aGVuIGl0IGRpc3BsYXlzIGFzIHRoZSBzdHJpbmcgJ3VuZGVmaW5lZCcsIHVnbHkhXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgZVNwYW5XaXRoVmFsdWUuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUudXNlQ2VsbFJlbmRlcmVyID0gZnVuY3Rpb24oY29sdW1uLCB2YWx1ZSwgbm9kZSwgJGNoaWxkU2NvcGUsIGVTcGFuV2l0aFZhbHVlLCByb3dJbmRleCwgcmVmcmVzaENlbGxGdW5jdGlvbiwgdmFsdWVHZXR0ZXIsIGVHcmlkQ2VsbCkge1xuICAgIHZhciBjb2xEZWYgPSBjb2x1bW4uY29sRGVmO1xuICAgIHZhciByZW5kZXJlclBhcmFtcyA9IHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICB2YWx1ZUdldHRlcjogdmFsdWVHZXR0ZXIsXG4gICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcbiAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgIGNvbHVtbjogY29sdW1uLFxuICAgICAgICAkc2NvcGU6ICRjaGlsZFNjb3BlLFxuICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXG4gICAgICAgIGFwaTogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKCksXG4gICAgICAgIGNvbnRleHQ6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKSxcbiAgICAgICAgcmVmcmVzaENlbGw6IHJlZnJlc2hDZWxsRnVuY3Rpb24sXG4gICAgICAgIGVHcmlkQ2VsbDogZUdyaWRDZWxsXG4gICAgfTtcbiAgICB2YXIgY2VsbFJlbmRlcmVyO1xuICAgIGlmICh0eXBlb2YgY29sRGVmLmNlbGxSZW5kZXJlciA9PT0gJ29iamVjdCcgJiYgY29sRGVmLmNlbGxSZW5kZXJlciAhPT0gbnVsbCkge1xuICAgICAgICBjZWxsUmVuZGVyZXIgPSB0aGlzLmNlbGxSZW5kZXJlck1hcFtjb2xEZWYuY2VsbFJlbmRlcmVyLnJlbmRlcmVyXTtcbiAgICAgICAgaWYgKCFjZWxsUmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHRocm93ICdDZWxsIHJlbmRlcmVyICcgKyBjb2xEZWYuY2VsbFJlbmRlcmVyICsgJyBub3QgZm91bmQsIGF2YWlsYWJsZSBhcmUgJyArIE9iamVjdC5rZXlzKHRoaXMuY2VsbFJlbmRlcmVyTWFwKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbERlZi5jZWxsUmVuZGVyZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY2VsbFJlbmRlcmVyID0gY29sRGVmLmNlbGxSZW5kZXJlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyAnQ2VsbCBSZW5kZXJlciBtdXN0IGJlIFN0cmluZyBvciBGdW5jdGlvbic7XG4gICAgfVxuICAgIHZhciByZXN1bHRGcm9tUmVuZGVyZXIgPSBjZWxsUmVuZGVyZXIocmVuZGVyZXJQYXJhbXMpO1xuICAgIGlmICh1dGlscy5pc05vZGVPckVsZW1lbnQocmVzdWx0RnJvbVJlbmRlcmVyKSkge1xuICAgICAgICAvLyBhIGRvbSBub2RlIG9yIGVsZW1lbnQgd2FzIHJldHVybmVkLCBzbyBhZGQgY2hpbGRcbiAgICAgICAgZVNwYW5XaXRoVmFsdWUuYXBwZW5kQ2hpbGQocmVzdWx0RnJvbVJlbmRlcmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBvdGhlcndpc2UgYXNzdW1lIGl0IHdhcyBodG1sLCBzbyBqdXN0IGluc2VydFxuICAgICAgICBlU3BhbldpdGhWYWx1ZS5pbm5lckhUTUwgPSByZXN1bHRGcm9tUmVuZGVyZXI7XG4gICAgfVxufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZFN0eWxlc0Zyb21Db2xsRGVmID0gZnVuY3Rpb24oY29sdW1uLCB2YWx1ZSwgbm9kZSwgJGNoaWxkU2NvcGUsIGVHcmlkQ2VsbCkge1xuICAgIHZhciBjb2xEZWYgPSBjb2x1bW4uY29sRGVmO1xuICAgIGlmIChjb2xEZWYuY2VsbFN0eWxlKSB7XG4gICAgICAgIHZhciBjc3NUb1VzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBjb2xEZWYuY2VsbFN0eWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgY2VsbFN0eWxlUGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGNvbHVtbixcbiAgICAgICAgICAgICAgICAkc2NvcGU6ICRjaGlsZFNjb3BlLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKSxcbiAgICAgICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY3NzVG9Vc2UgPSBjb2xEZWYuY2VsbFN0eWxlKGNlbGxTdHlsZVBhcmFtcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjc3NUb1VzZSA9IGNvbERlZi5jZWxsU3R5bGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3NzVG9Vc2UpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGNzc1RvVXNlKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIGVHcmlkQ2VsbC5zdHlsZVtrZXldID0gY3NzVG9Vc2Vba2V5XTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENsYXNzZXNGcm9tQ29sbERlZiA9IGZ1bmN0aW9uKGNvbERlZiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlR3JpZENlbGwpIHtcbiAgICBpZiAoY29sRGVmLmNlbGxDbGFzcykge1xuICAgICAgICB2YXIgY2xhc3NUb1VzZTtcbiAgICAgICAgaWYgKHR5cGVvZiBjb2xEZWYuY2VsbENsYXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgY2VsbENsYXNzUGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcbiAgICAgICAgICAgICAgICAkc2NvcGU6ICRjaGlsZFNjb3BlLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKSxcbiAgICAgICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2xhc3NUb1VzZSA9IGNvbERlZi5jZWxsQ2xhc3MoY2VsbENsYXNzUGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsYXNzVG9Vc2UgPSBjb2xEZWYuY2VsbENsYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBjbGFzc1RvVXNlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZUdyaWRDZWxsLCBjbGFzc1RvVXNlKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGNsYXNzVG9Vc2UpKSB7XG4gICAgICAgICAgICBjbGFzc1RvVXNlLmZvckVhY2goZnVuY3Rpb24oY3NzQ2xhc3NJdGVtKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZUdyaWRDZWxsLCBjc3NDbGFzc0l0ZW0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuYWRkQ2xhc3Nlc1RvQ2VsbCA9IGZ1bmN0aW9uKGNvbHVtbiwgbm9kZSwgZUdyaWRDZWxsKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2FnLWNlbGwnLCAnYWctY2VsbC1uby1mb2N1cycsICdjZWxsLWNvbC0nICsgY29sdW1uLmluZGV4XTtcbiAgICBpZiAobm9kZS5ncm91cCkge1xuICAgICAgICBpZiAobm9kZS5mb290ZXIpIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaCgnYWctZm9vdGVyLWNlbGwnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaCgnYWctZ3JvdXAtY2VsbCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVHcmlkQ2VsbC5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRDbGFzc2VzRnJvbVJ1bGVzID0gZnVuY3Rpb24oY29sRGVmLCBlR3JpZENlbGwsIHZhbHVlLCBub2RlLCByb3dJbmRleCkge1xuICAgIHZhciBjbGFzc1J1bGVzID0gY29sRGVmLmNlbGxDbGFzc1J1bGVzO1xuICAgIGlmICh0eXBlb2YgY2xhc3NSdWxlcyA9PT0gJ29iamVjdCcgJiYgY2xhc3NSdWxlcyAhPT0gbnVsbCkge1xuXG4gICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXG4gICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXG4gICAgICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpLFxuICAgICAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIGNsYXNzTmFtZXMgPSBPYmplY3Qua2V5cyhjbGFzc1J1bGVzKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGFzc05hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2xhc3NOYW1lID0gY2xhc3NOYW1lc1tpXTtcbiAgICAgICAgICAgIHZhciBydWxlID0gY2xhc3NSdWxlc1tjbGFzc05hbWVdO1xuICAgICAgICAgICAgdmFyIHJlc3VsdE9mUnVsZTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRPZlJ1bGUgPSB0aGlzLmV4cHJlc3Npb25TZXJ2aWNlLmV2YWx1YXRlKHJ1bGUsIHBhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBydWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0T2ZSdWxlID0gcnVsZShwYXJhbXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdE9mUnVsZSkge1xuICAgICAgICAgICAgICAgIHV0aWxzLmFkZENzc0NsYXNzKGVHcmlkQ2VsbCwgY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbHMucmVtb3ZlQ3NzQ2xhc3MoZUdyaWRDZWxsLCBjbGFzc05hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUNlbGwgPSBmdW5jdGlvbihpc0ZpcnN0Q29sdW1uLCBjb2x1bW4sIHZhbHVlR2V0dGVyLCBub2RlLCByb3dJbmRleCwgJGNoaWxkU2NvcGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIGVHcmlkQ2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgZUdyaWRDZWxsLnNldEF0dHJpYnV0ZShcImNvbFwiLCBjb2x1bW4uaW5kZXgpO1xuXG4gICAgLy8gb25seSBzZXQgdGFiIGluZGV4IGlmIGNlbGwgc2VsZWN0aW9uIGlzIGVuYWJsZWRcbiAgICBpZiAoIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzU3VwcHJlc3NDZWxsU2VsZWN0aW9uKCkpIHtcbiAgICAgICAgZUdyaWRDZWxsLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiLTFcIik7XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlO1xuICAgIGlmICh2YWx1ZUdldHRlcikge1xuICAgICAgICB2YWx1ZSA9IHZhbHVlR2V0dGVyKCk7XG4gICAgfVxuXG4gICAgLy8gdGhlc2UgYXJlIHRoZSBncmlkIHN0eWxlcywgZG9uJ3QgY2hhbmdlIGJldHdlZW4gc29mdCByZWZyZXNoZXNcbiAgICB0aGlzLmFkZENsYXNzZXNUb0NlbGwoY29sdW1uLCBub2RlLCBlR3JpZENlbGwpO1xuXG4gICAgdGhpcy5wb3B1bGF0ZUFuZFN0eWxlR3JpZENlbGwodmFsdWVHZXR0ZXIsIHZhbHVlLCBlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgcm93SW5kZXgsICRjaGlsZFNjb3BlKTtcblxuICAgIHRoaXMuYWRkQ2VsbENsaWNrZWRIYW5kbGVyKGVHcmlkQ2VsbCwgbm9kZSwgY29sdW1uLCB2YWx1ZSwgcm93SW5kZXgpO1xuICAgIHRoaXMuYWRkQ2VsbEhvdmVySGFuZGxlcihlR3JpZENlbGwsIG5vZGUsIGNvbHVtbiwgdmFsdWUsIHJvd0luZGV4KTtcbiAgICB0aGlzLmFkZENlbGxEb3VibGVDbGlja2VkSGFuZGxlcihlR3JpZENlbGwsIG5vZGUsIGNvbHVtbiwgdmFsdWUsIHJvd0luZGV4LCAkY2hpbGRTY29wZSwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpO1xuXG4gICAgdGhpcy5hZGRDZWxsTmF2aWdhdGlvbkhhbmRsZXIoZUdyaWRDZWxsLCByb3dJbmRleCwgY29sdW1uLCBub2RlKTtcblxuICAgIGVHcmlkQ2VsbC5zdHlsZS53aWR0aCA9IHV0aWxzLmZvcm1hdFdpZHRoKGNvbHVtbi5hY3R1YWxXaWR0aCk7XG5cbiAgICAvLyBhZGQgdGhlICdzdGFydCBlZGl0aW5nJyBjYWxsIHRvIHRoZSBjaGFpbiBvZiBlZGl0b3JzXG4gICAgdGhpcy5yZW5kZXJlZFJvd1N0YXJ0RWRpdGluZ0xpc3RlbmVyc1tyb3dJbmRleF1bY29sdW1uLmNvbElkXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodGhhdC5pc0NlbGxFZGl0YWJsZShjb2x1bW4uY29sRGVmLCBub2RlKSkge1xuICAgICAgICAgICAgdGhhdC5zdGFydEVkaXRpbmcoZUdyaWRDZWxsLCBjb2x1bW4sIG5vZGUsICRjaGlsZFNjb3BlLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGVHcmlkQ2VsbDtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5hZGRDZWxsTmF2aWdhdGlvbkhhbmRsZXIgPSBmdW5jdGlvbihlR3JpZENlbGwsIHJvd0luZGV4LCBjb2x1bW4sIG5vZGUpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgZUdyaWRDZWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAodGhhdC5lZGl0aW5nQ2VsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIG9ubHkgaW50ZXJlc3RlZCBvbiBrZXkgcHJlc3NlcyB0aGF0IGFyZSBkaXJlY3RseSBvbiB0aGlzIGVsZW1lbnQsIG5vdCBhbnkgY2hpbGRyZW4gZWxlbWVudHMuIHRoaXNcbiAgICAgICAgLy8gc3RvcHMgbmF2aWdhdGlvbiBpZiB0aGUgdXNlciBpcyBpbiwgZm9yIGV4YW1wbGUsIGEgdGV4dCBmaWVsZCBpbnNpZGUgdGhlIGNlbGwsIGFuZCB1c2VyIGhpdHNcbiAgICAgICAgLy8gb24gb2YgdGhlIGtleXMgd2UgYXJlIGxvb2tpbmcgZm9yLlxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0ICE9PSBlR3JpZENlbGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXkgPSBldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlO1xuXG4gICAgICAgIHZhciBzdGFydE5hdmlnYXRpb24gPSBrZXkgPT09IGNvbnN0YW50cy5LRVlfRE9XTiB8fCBrZXkgPT09IGNvbnN0YW50cy5LRVlfVVBcbiAgICAgICAgICAgIHx8IGtleSA9PT0gY29uc3RhbnRzLktFWV9MRUZUIHx8IGtleSA9PT0gY29uc3RhbnRzLktFWV9SSUdIVDtcbiAgICAgICAgaWYgKHN0YXJ0TmF2aWdhdGlvbikge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHRoYXQubmF2aWdhdGVUb05leHRDZWxsKGtleSwgcm93SW5kZXgsIGNvbHVtbik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RhcnRFZGl0ID0ga2V5ID09PSBjb25zdGFudHMuS0VZX0VOVEVSO1xuICAgICAgICBpZiAoc3RhcnRFZGl0KSB7XG4gICAgICAgICAgICB2YXIgc3RhcnRFZGl0aW5nRnVuYyA9IHRoYXQucmVuZGVyZWRSb3dTdGFydEVkaXRpbmdMaXN0ZW5lcnNbcm93SW5kZXhdW2NvbHVtbi5jb2xJZF07XG4gICAgICAgICAgICBpZiAoc3RhcnRFZGl0aW5nRnVuYykge1xuICAgICAgICAgICAgICAgIHZhciBlZGl0aW5nU3RhcnRlZCA9IHN0YXJ0RWRpdGluZ0Z1bmMoKTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdGluZ1N0YXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgd2UgZG9uJ3QgcHJldmVudCBkZWZhdWx0LCB0aGVuIHRoZSBlZGl0b3IgdGhhdCBnZXQgZGlzcGxheWVkIGFsc28gcGlja3MgdXAgdGhlICdlbnRlciBrZXknXG4gICAgICAgICAgICAgICAgICAgIC8vIHByZXNzLCBhbmQgc3RvcHMgZWRpdGluZyBpbW1lZGlhdGVseSwgaGVuY2UgZ2l2aW5nIGhlIHVzZXIgZXhwZXJpZW5jZSB0aGF0IG5vdGhpbmcgaGFwcGVuZWRcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc2VsZWN0Um93ID0ga2V5ID09PSBjb25zdGFudHMuS0VZX1NQQUNFO1xuICAgICAgICBpZiAoc2VsZWN0Um93ICYmIHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93U2VsZWN0aW9uKCkpIHtcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZCA9IHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5pc05vZGVTZWxlY3RlZChub2RlKTtcbiAgICAgICAgICAgIGlmIChzZWxlY3RlZCkge1xuICAgICAgICAgICAgICAgIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5kZXNlbGVjdE5vZGUobm9kZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5zZWxlY3ROb2RlKG5vZGUsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gd2UgdXNlIGluZGV4IGZvciByb3dzLCBidXQgY29sdW1uIG9iamVjdCBmb3IgY29sdW1ucywgYXMgdGhlIG5leHQgY29sdW1uIChieSBpbmRleCkgbWlnaHQgbm90XG4vLyBiZSB2aXNpYmxlIChoZWFkZXIgZ3JvdXBpbmcpIHNvIGl0J3Mgbm90IHJlbGlhYmxlLCBzbyB1c2luZyB0aGUgY29sdW1uIG9iamVjdCBpbnN0ZWFkLlxuUm93UmVuZGVyZXIucHJvdG90eXBlLm5hdmlnYXRlVG9OZXh0Q2VsbCA9IGZ1bmN0aW9uKGtleSwgcm93SW5kZXgsIGNvbHVtbikge1xuXG4gICAgdmFyIGNlbGxUb0ZvY3VzID0ge3Jvd0luZGV4OiByb3dJbmRleCwgY29sdW1uOiBjb2x1bW59O1xuICAgIHZhciByZW5kZXJlZFJvdztcbiAgICB2YXIgZUNlbGw7XG5cbiAgICAvLyB3ZSBrZWVwIHNlYXJjaGluZyBmb3IgYSBuZXh0IGNlbGwgdW50aWwgd2UgZmluZCBvbmUuIHRoaXMgaXMgaG93IHRoZSBncm91cCByb3dzIGdldCBza2lwcGVkXG4gICAgd2hpbGUgKCFlQ2VsbCkge1xuICAgICAgICBjZWxsVG9Gb2N1cyA9IHRoaXMuZ2V0TmV4dENlbGxUb0ZvY3VzKGtleSwgY2VsbFRvRm9jdXMpO1xuICAgICAgICAvLyBubyBuZXh0IGNlbGwgbWVhbnMgd2UgaGF2ZSByZWFjaGVkIGEgZ3JpZCBib3VuZGFyeSwgZWcgbGVmdCwgcmlnaHQsIHRvcCBvciBib3R0b20gb2YgZ3JpZFxuICAgICAgICBpZiAoIWNlbGxUb0ZvY3VzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2VlIGlmIHRoZSBuZXh0IGNlbGwgaXMgc2VsZWN0YWJsZSwgaWYgeWVzLCB1c2UgaXQsIGlmIG5vdCwgc2tpcCBpdFxuICAgICAgICByZW5kZXJlZFJvdyA9IHRoaXMucmVuZGVyZWRSb3dzW2NlbGxUb0ZvY3VzLnJvd0luZGV4XTtcbiAgICAgICAgZUNlbGwgPSByZW5kZXJlZFJvdy5lQ2VsbHNbY2VsbFRvRm9jdXMuY29sdW1uLmNvbElkXTtcbiAgICB9XG5cbiAgICAvLyB0aGlzIHNjcm9sbHMgdGhlIHJvdyBpbnRvIHZpZXdcbiAgICB0aGlzLmdyaWRQYW5lbC5lbnN1cmVJbmRleFZpc2libGUocmVuZGVyZWRSb3cucm93SW5kZXgpO1xuXG4gICAgLy8gdGhpcyBjaGFuZ2VzIHRoZSBjc3Mgb24gdGhlIGNlbGxcbiAgICB0aGlzLmZvY3VzQ2VsbChlQ2VsbCwgY2VsbFRvRm9jdXMucm93SW5kZXgsIGNlbGxUb0ZvY3VzLmNvbHVtbi5pbmRleCwgdHJ1ZSk7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuZ2V0TmV4dENlbGxUb0ZvY3VzID0gZnVuY3Rpb24oa2V5LCBsYXN0Q2VsbFRvRm9jdXMpIHtcbiAgICB2YXIgbGFzdFJvd0luZGV4ID0gbGFzdENlbGxUb0ZvY3VzLnJvd0luZGV4O1xuICAgIHZhciBsYXN0Q29sdW1uID0gbGFzdENlbGxUb0ZvY3VzLmNvbHVtbjtcblxuICAgIHZhciBuZXh0Um93VG9Gb2N1cztcbiAgICB2YXIgbmV4dENvbHVtblRvRm9jdXM7XG4gICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgY2FzZSBjb25zdGFudHMuS0VZX1VQIDpcbiAgICAgICAgICAgIC8vIGlmIGFscmVhZHkgb24gdG9wIHJvdywgZG8gbm90aGluZ1xuICAgICAgICAgICAgaWYgKGxhc3RSb3dJbmRleCA9PT0gdGhpcy5maXJzdFZpcnR1YWxSZW5kZXJlZFJvdykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dFJvd1RvRm9jdXMgPSBsYXN0Um93SW5kZXggLSAxO1xuICAgICAgICAgICAgbmV4dENvbHVtblRvRm9jdXMgPSBsYXN0Q29sdW1uO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLktFWV9ET1dOIDpcbiAgICAgICAgICAgIC8vIGlmIGFscmVhZHkgb24gYm90dG9tLCBkbyBub3RoaW5nXG4gICAgICAgICAgICBpZiAobGFzdFJvd0luZGV4ID09PSB0aGlzLmxhc3RWaXJ0dWFsUmVuZGVyZWRSb3cpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRSb3dUb0ZvY3VzID0gbGFzdFJvd0luZGV4ICsgMTtcbiAgICAgICAgICAgIG5leHRDb2x1bW5Ub0ZvY3VzID0gbGFzdENvbHVtbjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIGNvbnN0YW50cy5LRVlfUklHSFQgOlxuICAgICAgICAgICAgdmFyIGNvbFRvUmlnaHQgPSB0aGlzLmNvbHVtbk1vZGVsLmdldFZpc2libGVDb2xBZnRlcihsYXN0Q29sdW1uKTtcbiAgICAgICAgICAgIC8vIGlmIGFscmVhZHkgb24gcmlnaHQsIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIGlmICghY29sVG9SaWdodCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV4dFJvd1RvRm9jdXMgPSBsYXN0Um93SW5kZXggO1xuICAgICAgICAgICAgbmV4dENvbHVtblRvRm9jdXMgPSBjb2xUb1JpZ2h0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgY29uc3RhbnRzLktFWV9MRUZUIDpcbiAgICAgICAgICAgIHZhciBjb2xUb0xlZnQgPSB0aGlzLmNvbHVtbk1vZGVsLmdldFZpc2libGVDb2xCZWZvcmUobGFzdENvbHVtbik7XG4gICAgICAgICAgICAvLyBpZiBhbHJlYWR5IG9uIGxlZnQsIGRvIG5vdGhpbmdcbiAgICAgICAgICAgIGlmICghY29sVG9MZWZ0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXh0Um93VG9Gb2N1cyA9IGxhc3RSb3dJbmRleCA7XG4gICAgICAgICAgICBuZXh0Q29sdW1uVG9Gb2N1cyA9IGNvbFRvTGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHJvd0luZGV4OiBuZXh0Um93VG9Gb2N1cyxcbiAgICAgICAgY29sdW1uOiBuZXh0Q29sdW1uVG9Gb2N1c1xuICAgIH07XG59O1xuXG4vLyBjYWxsZWQgaW50ZXJuYWxseVxuUm93UmVuZGVyZXIucHJvdG90eXBlLmZvY3VzQ2VsbCA9IGZ1bmN0aW9uKGVDZWxsLCByb3dJbmRleCwgY29sSW5kZXgsIGZvcmNlQnJvd3NlckZvY3VzKSB7XG4gICAgLy8gZG8gbm90aGluZyBpZiBjZWxsIHNlbGVjdGlvbiBpcyBvZmZcbiAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNTdXBwcmVzc0NlbGxTZWxlY3Rpb24oKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGFueSBwcmV2aW91cyBmb2N1c1xuICAgIHV0aWxzLnF1ZXJ5U2VsZWN0b3JBbGxfcmVwbGFjZUNzc0NsYXNzKHRoaXMuZVBhcmVudE9mUm93cywgJy5hZy1jZWxsLWZvY3VzJywgJ2FnLWNlbGwtZm9jdXMnLCAnYWctY2VsbC1uby1mb2N1cycpO1xuXG4gICAgdmFyIHNlbGVjdG9yRm9yQ2VsbCA9ICdbcm93PVwiJyArIHJvd0luZGV4ICsgJ1wiXSBbY29sPVwiJyArIGNvbEluZGV4ICsgJ1wiXSc7XG4gICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9yZXBsYWNlQ3NzQ2xhc3ModGhpcy5lUGFyZW50T2ZSb3dzLCBzZWxlY3RvckZvckNlbGwsICdhZy1jZWxsLW5vLWZvY3VzJywgJ2FnLWNlbGwtZm9jdXMnKTtcblxuICAgIHRoaXMuZm9jdXNlZENlbGwgPSB7cm93SW5kZXg6IHJvd0luZGV4LCBjb2xJbmRleDogY29sSW5kZXgsIG5vZGU6IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvdyhyb3dJbmRleCl9O1xuXG4gICAgLy8gdGhpcyBwdXRzIHRoZSBicm93c2VyIGZvY3VzIG9uIHRoZSBjZWxsIChzbyBpdCBnZXRzIGtleSBwcmVzc2VzKVxuICAgIGlmIChmb3JjZUJyb3dzZXJGb2N1cykge1xuICAgICAgICBlQ2VsbC5mb2N1cygpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbEZvY3VzZWQoKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDZWxsRm9jdXNlZCgpKHRoaXMuZm9jdXNlZENlbGwpO1xuICAgIH1cbn07XG5cbi8vIGZvciBBUElcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5nZXRGb2N1c2VkQ2VsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmZvY3VzZWRDZWxsO1xufTtcblxuLy8gY2FsbGVkIHZpYSBBUElcblJvd1JlbmRlcmVyLnByb3RvdHlwZS5zZXRGb2N1c2VkQ2VsbCA9IGZ1bmN0aW9uKHJvd0luZGV4LCBjb2xJbmRleCkge1xuICAgIHZhciByZW5kZXJlZFJvdyA9IHRoaXMucmVuZGVyZWRSb3dzW3Jvd0luZGV4XTtcbiAgICB2YXIgY29sdW1uID0gdGhpcy5jb2x1bW5Nb2RlbC5nZXREaXNwbGF5ZWRDb2x1bW5zKClbY29sSW5kZXhdO1xuICAgIGlmIChyZW5kZXJlZFJvdyAmJiBjb2x1bW4pIHtcbiAgICAgICAgdmFyIGVDZWxsID0gcmVuZGVyZWRSb3cuZUNlbGxzW2NvbHVtbi5jb2xJZF07XG4gICAgICAgIHRoaXMuZm9jdXNDZWxsKGVDZWxsLCByb3dJbmRleCwgY29sSW5kZXgsIHRydWUpO1xuICAgIH1cbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5wb3B1bGF0ZUFuZFN0eWxlR3JpZENlbGwgPSBmdW5jdGlvbih2YWx1ZUdldHRlciwgdmFsdWUsIGVHcmlkQ2VsbCwgaXNGaXJzdENvbHVtbiwgbm9kZSwgY29sdW1uLCByb3dJbmRleCwgJGNoaWxkU2NvcGUpIHtcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcblxuICAgIC8vIHBvcHVsYXRlXG4gICAgdGhpcy5wb3B1bGF0ZUdyaWRDZWxsKGVHcmlkQ2VsbCwgaXNGaXJzdENvbHVtbiwgbm9kZSwgY29sdW1uLCByb3dJbmRleCwgdmFsdWUsIHZhbHVlR2V0dGVyLCAkY2hpbGRTY29wZSk7XG4gICAgLy8gc3R5bGVcbiAgICB0aGlzLmFkZFN0eWxlc0Zyb21Db2xsRGVmKGNvbHVtbiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlR3JpZENlbGwpO1xuICAgIHRoaXMuYWRkQ2xhc3Nlc0Zyb21Db2xsRGVmKGNvbERlZiwgdmFsdWUsIG5vZGUsICRjaGlsZFNjb3BlLCBlR3JpZENlbGwpO1xuICAgIHRoaXMuYWRkQ2xhc3Nlc0Zyb21SdWxlcyhjb2xEZWYsIGVHcmlkQ2VsbCwgdmFsdWUsIG5vZGUsIHJvd0luZGV4KTtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5wb3B1bGF0ZUdyaWRDZWxsID0gZnVuY3Rpb24oZUdyaWRDZWxsLCBpc0ZpcnN0Q29sdW1uLCBub2RlLCBjb2x1bW4sIHJvd0luZGV4LCB2YWx1ZSwgdmFsdWVHZXR0ZXIsICRjaGlsZFNjb3BlKSB7XG4gICAgdmFyIGVDZWxsV3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICB1dGlscy5hZGRDc3NDbGFzcyhlQ2VsbFdyYXBwZXIsIFwiYWctY2VsbC13cmFwcGVyXCIpO1xuICAgIGVHcmlkQ2VsbC5hcHBlbmRDaGlsZChlQ2VsbFdyYXBwZXIpO1xuXG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XG4gICAgaWYgKGNvbERlZi5jaGVja2JveFNlbGVjdGlvbikge1xuICAgICAgICB2YXIgZUNoZWNrYm94ID0gdGhpcy5zZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkuY3JlYXRlU2VsZWN0aW9uQ2hlY2tib3gobm9kZSwgcm93SW5kZXgpO1xuICAgICAgICBlQ2VsbFdyYXBwZXIuYXBwZW5kQ2hpbGQoZUNoZWNrYm94KTtcbiAgICB9XG5cbiAgICAvLyBldmVudHVhbGx5IHdlIGNhbGwgZVNwYW5XaXRoVmFsdWUuaW5uZXJIVE1MID0geHh4LCBzbyBjYW5ub3QgaW5jbHVkZSB0aGUgY2hlY2tib3ggKGFib3ZlKSBpbiB0aGlzIHNwYW5cbiAgICB2YXIgZVNwYW5XaXRoVmFsdWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICB1dGlscy5hZGRDc3NDbGFzcyhlU3BhbldpdGhWYWx1ZSwgXCJhZy1jZWxsLXZhbHVlXCIpO1xuXG4gICAgZUNlbGxXcmFwcGVyLmFwcGVuZENoaWxkKGVTcGFuV2l0aFZhbHVlKTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgcmVmcmVzaENlbGxGdW5jdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGF0LnNvZnRSZWZyZXNoQ2VsbChlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgJGNoaWxkU2NvcGUsIHJvd0luZGV4KTtcbiAgICB9O1xuXG4gICAgdGhpcy5wdXREYXRhSW50b0NlbGwoY29sdW1uLCB2YWx1ZSwgdmFsdWVHZXR0ZXIsIG5vZGUsICRjaGlsZFNjb3BlLCBlU3BhbldpdGhWYWx1ZSwgZUdyaWRDZWxsLCByb3dJbmRleCwgcmVmcmVzaENlbGxGdW5jdGlvbik7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuYWRkQ2VsbERvdWJsZUNsaWNrZWRIYW5kbGVyID0gZnVuY3Rpb24oZUdyaWRDZWxsLCBub2RlLCBjb2x1bW4sIHZhbHVlLCByb3dJbmRleCwgJGNoaWxkU2NvcGUsIGlzRmlyc3RDb2x1bW4sIHZhbHVlR2V0dGVyKSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBjb2xEZWYgPSBjb2x1bW4uY29sRGVmO1xuICAgIGVHcmlkQ2VsbC5hZGRFdmVudExpc3RlbmVyKFwiZGJsY2xpY2tcIiwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENlbGxEb3VibGVDbGlja2VkKCkpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXNGb3JHcmlkID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICAgICAgICAgIGV2ZW50U291cmNlOiB0aGlzLFxuICAgICAgICAgICAgICAgIGFwaTogdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGF0LmdyaWRPcHRpb25zV3JhcHBlci5nZXRDZWxsRG91YmxlQ2xpY2tlZCgpKHBhcmFtc0ZvckdyaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb2xEZWYuY2VsbERvdWJsZUNsaWNrZWQpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXNGb3JDb2xEZWYgPSB7XG4gICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBub2RlLmRhdGEsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIHJvd0luZGV4OiByb3dJbmRleCxcbiAgICAgICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcbiAgICAgICAgICAgICAgICBldmVudDogZXZlbnQsXG4gICAgICAgICAgICAgICAgZXZlbnRTb3VyY2U6IHRoaXMsXG4gICAgICAgICAgICAgICAgYXBpOiB0aGF0LmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbERlZi5jZWxsRG91YmxlQ2xpY2tlZChwYXJhbXNGb3JDb2xEZWYpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGF0LmlzQ2VsbEVkaXRhYmxlKGNvbERlZiwgbm9kZSkpIHtcbiAgICAgICAgICAgIHRoYXQuc3RhcnRFZGl0aW5nKGVHcmlkQ2VsbCwgY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgcm93SW5kZXgsIGlzRmlyc3RDb2x1bW4sIHZhbHVlR2V0dGVyKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENlbGxDbGlja2VkSGFuZGxlciA9IGZ1bmN0aW9uKGVHcmlkQ2VsbCwgbm9kZSwgY29sdW1uLCB2YWx1ZSwgcm93SW5kZXgpIHtcbiAgICB2YXIgY29sRGVmID0gY29sdW1uLmNvbERlZjtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgZUdyaWRDZWxsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAvLyB3ZSBwYXNzIGZhbHNlIHRvIGZvY3VzQ2VsbCwgYXMgd2UgZG9uJ3Qgd2FudCB0aGUgY2VsbCB0byBmb2N1c1xuICAgICAgICAvLyBhbHNvIGdldCB0aGUgYnJvd3NlciBmb2N1cy4gaWYgd2UgZGlkLCB0aGVuIHRoZSBjZWxsUmVuZGVyZXIgY291bGRcbiAgICAgICAgLy8gaGF2ZSBhIHRleHQgZmllbGQgaW4gaXQsIGZvciBleGFtcGxlLCBhbmQgYXMgdGhlIHVzZXIgY2xpY2tzIG9uIHRoZVxuICAgICAgICAvLyB0ZXh0IGZpZWxkLCB0aGUgdGV4dCBmaWVsZCwgdGhlIGZvY3VzIGRvZXNuJ3QgZ2V0IHRvIHRoZSB0ZXh0XG4gICAgICAgIC8vIGZpZWxkLCBpbnN0ZWFkIHRvIGdvZXMgdG8gdGhlIGRpdiBiZWhpbmQsIG1ha2luZyBpdCBpbXBvc3NpYmxlIHRvXG4gICAgICAgIC8vIHNlbGVjdCB0aGUgdGV4dCBmaWVsZC5cbiAgICAgICAgdGhhdC5mb2N1c0NlbGwoZUdyaWRDZWxsLCByb3dJbmRleCwgY29sdW1uLmluZGV4LCBmYWxzZSk7XG4gICAgICAgIGlmICh0aGF0LmdyaWRPcHRpb25zV3JhcHBlci5nZXRDZWxsQ2xpY2tlZCgpKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zRm9yR3JpZCA9IHtcbiAgICAgICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgICAgIGRhdGE6IG5vZGUuZGF0YSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxuICAgICAgICAgICAgICAgIGNvbERlZjogY29sRGVmLFxuICAgICAgICAgICAgICAgIGV2ZW50OiBldmVudCxcbiAgICAgICAgICAgICAgICBldmVudFNvdXJjZTogdGhpcyxcbiAgICAgICAgICAgICAgICBhcGk6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbENsaWNrZWQoKShwYXJhbXNGb3JHcmlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sRGVmLmNlbGxDbGlja2VkKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zRm9yQ29sRGVmID0ge1xuICAgICAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGV2ZW50LFxuICAgICAgICAgICAgICAgIGV2ZW50U291cmNlOiB0aGlzLFxuICAgICAgICAgICAgICAgIGFwaTogdGhhdC5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0QXBpKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb2xEZWYuY2VsbENsaWNrZWQocGFyYW1zRm9yQ29sRGVmKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuUm93UmVuZGVyZXIucHJvdG90eXBlLmFkZENlbGxIb3ZlckhhbmRsZXIgPSBmdW5jdGlvbihlR3JpZENlbGwsIG5vZGUsIGNvbHVtbiwgdmFsdWUsIHJvd0luZGV4KSB7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHZhciBjb2xEZWYgPSBjb2x1bW4uY29sRGVmO1xuICAgIHZhciBob3ZlckhhbmRsZXIgPSBjb2xEZWYuY2VsbEhvdmVySGFuZGxlcjtcblxuICAgIGlmIChob3ZlckhhbmRsZXIpIHtcbiAgICAgICAgZUdyaWRDZWxsLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWVudGVyXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHZhciBob3ZlclBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBjb2xEZWY6IGNvbERlZixcbiAgICAgICAgICAgICAgICBldmVudDogZSxcbiAgICAgICAgICAgICAgICBlbnRlcmluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgICBsZWF2aW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICByb3dJbmRleDogcm93SW5kZXgsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldENvbnRleHQoKSxcbiAgICAgICAgICAgICAgICBhcGk6IHRoYXQuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaG92ZXJIYW5kbGVyKGhvdmVyUGFyYW1zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVHcmlkQ2VsbC5hZGRFdmVudExpc3RlbmVyKFwibW91c2VsZWF2ZVwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICB2YXIgaG92ZXJQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICAgICAgZXZlbnQ6IGUsXG4gICAgICAgICAgICAgICAgZW50ZXJpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGxlYXZpbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICBjb250ZXh0OiB0aGF0LmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KCksXG4gICAgICAgICAgICAgICAgYXBpOiB0aGF0LmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGhvdmVySGFuZGxlcihob3ZlclBhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS5pc0NlbGxFZGl0YWJsZSA9IGZ1bmN0aW9uKGNvbERlZiwgbm9kZSkge1xuICAgIGlmICh0aGlzLmVkaXRpbmdDZWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBuZXZlciBhbGxvdyBlZGl0aW5nIG9mIGdyb3Vwc1xuICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBpZiBib29sZWFuIHNldCwgdGhlbiBqdXN0IHVzZSBpdFxuICAgIGlmICh0eXBlb2YgY29sRGVmLmVkaXRhYmxlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuIGNvbERlZi5lZGl0YWJsZTtcbiAgICB9XG5cbiAgICAvLyBpZiBmdW5jdGlvbiwgdGhlbiBjYWxsIHRoZSBmdW5jdGlvbiB0byBmaW5kIG91dFxuICAgIGlmICh0eXBlb2YgY29sRGVmLmVkaXRhYmxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIHNob3VsZCBjaGFuZ2UgdGhpcywgc28gaXQgZ2V0cyBwYXNzZWQgcGFyYW1zIHdpdGggbmljZSB1c2VmdWwgdmFsdWVzXG4gICAgICAgIHJldHVybiBjb2xEZWYuZWRpdGFibGUobm9kZS5kYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuc3RvcEVkaXRpbmcgPSBmdW5jdGlvbihlR3JpZENlbGwsIGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIGVJbnB1dCwgYmx1ckxpc3RlbmVyLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpIHtcbiAgICB0aGlzLmVkaXRpbmdDZWxsID0gZmFsc2U7XG4gICAgdmFyIG5ld1ZhbHVlID0gZUlucHV0LnZhbHVlO1xuICAgIHZhciBjb2xEZWYgPSBjb2x1bW4uY29sRGVmO1xuXG4gICAgLy9JZiB3ZSBkb24ndCByZW1vdmUgdGhlIGJsdXIgbGlzdGVuZXIgZmlyc3QsIHdlIGdldDpcbiAgICAvL1VuY2F1Z2h0IE5vdEZvdW5kRXJyb3I6IEZhaWxlZCB0byBleGVjdXRlICdyZW1vdmVDaGlsZCcgb24gJ05vZGUnOiBUaGUgbm9kZSB0byBiZSByZW1vdmVkIGlzIG5vIGxvbmdlciBhIGNoaWxkIG9mIHRoaXMgbm9kZS4gUGVyaGFwcyBpdCB3YXMgbW92ZWQgaW4gYSAnYmx1cicgZXZlbnQgaGFuZGxlcj9cbiAgICBlSW5wdXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmx1cicsIGJsdXJMaXN0ZW5lcik7XG5cbiAgICB1dGlscy5yZW1vdmVBbGxDaGlsZHJlbihlR3JpZENlbGwpO1xuXG4gICAgdmFyIHBhcmFtc0ZvckNhbGxiYWNrcyA9IHtcbiAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgZGF0YTogbm9kZS5kYXRhLFxuICAgICAgICBvbGRWYWx1ZTogbm9kZS5kYXRhW2NvbERlZi5maWVsZF0sXG4gICAgICAgIG5ld1ZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxuICAgICAgICBjb2xEZWY6IGNvbERlZixcbiAgICAgICAgYXBpOiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRBcGkoKSxcbiAgICAgICAgY29udGV4dDogdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q29udGV4dCgpXG4gICAgfTtcblxuICAgIGlmIChjb2xEZWYubmV3VmFsdWVIYW5kbGVyKSB7XG4gICAgICAgIGNvbERlZi5uZXdWYWx1ZUhhbmRsZXIocGFyYW1zRm9yQ2FsbGJhY2tzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBub2RlLmRhdGFbY29sRGVmLmZpZWxkXSA9IG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIC8vIGF0IHRoaXMgcG9pbnQsIHRoZSB2YWx1ZSBoYXMgYmVlbiB1cGRhdGVkXG4gICAgdmFyIG5ld1ZhbHVlO1xuICAgIGlmICh2YWx1ZUdldHRlcikge1xuICAgICAgICBuZXdWYWx1ZSA9IHZhbHVlR2V0dGVyKCk7XG4gICAgfVxuICAgIHBhcmFtc0ZvckNhbGxiYWNrcy5uZXdWYWx1ZSA9IG5ld1ZhbHVlO1xuICAgIGlmICh0eXBlb2YgY29sRGVmLmNlbGxWYWx1ZUNoYW5nZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29sRGVmLmNlbGxWYWx1ZUNoYW5nZWQocGFyYW1zRm9yQ2FsbGJhY2tzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDZWxsVmFsdWVDaGFuZ2VkKCkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Q2VsbFZhbHVlQ2hhbmdlZCgpKHBhcmFtc0ZvckNhbGxiYWNrcyk7XG4gICAgfVxuXG4gICAgdGhpcy5wb3B1bGF0ZUFuZFN0eWxlR3JpZENlbGwodmFsdWVHZXR0ZXIsIG5ld1ZhbHVlLCBlR3JpZENlbGwsIGlzRmlyc3RDb2x1bW4sIG5vZGUsIGNvbHVtbiwgcm93SW5kZXgsICRjaGlsZFNjb3BlKTtcbn07XG5cblJvd1JlbmRlcmVyLnByb3RvdHlwZS51c2VFZGl0Q2VsbFJlbmRlcmVyID0gZnVuY3Rpb24oY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgcm93SW5kZXgsIHZhbHVlR2V0dGVyKSB7XG4gICAgdmFyIGNvbERlZiA9IGNvbHVtbi5jb2xEZWY7XG4gICAgdmFyIHJlbmRlcmVyUGFyYW1zID0ge1xuICAgICAgICB2YWx1ZTogdmFsdWVHZXR0ZXIoKSxcbiAgICAgICAgdmFsdWVHZXR0ZXI6IHZhbHVlR2V0dGVyLFxuICAgICAgICBkYXRhOiBub2RlLmRhdGEsXG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIGNvbERlZjogY29sRGVmLFxuICAgICAgICBjb2x1bW46IGNvbHVtbixcbiAgICAgICAgJHNjb3BlOiAkY2hpbGRTY29wZSxcbiAgICAgICAgcm93SW5kZXg6IHJvd0luZGV4LFxuICAgICAgICBhcGk6IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEFwaSgpLFxuICAgICAgICBjb250ZXh0OiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRDb250ZXh0KCksXG4gICAgfTtcblxuICAgIHZhciBlZGl0UmVuZGVyZXIgPSBjb2xEZWYuZWRpdENlbGxSZW5kZXJlcjtcbiAgICB2YXIgcmVzdWx0RnJvbVJlbmRlcmVyID0gZWRpdFJlbmRlcmVyKHJlbmRlcmVyUGFyYW1zKTtcblxuICAgIHJldHVybiByZXN1bHRGcm9tUmVuZGVyZXI7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuc3RhcnRFZGl0aW5nID0gZnVuY3Rpb24oZUdyaWRDZWxsLCBjb2x1bW4sIG5vZGUsICRjaGlsZFNjb3BlLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5lZGl0aW5nQ2VsbCA9IHRydWU7XG4gICAgdXRpbHMucmVtb3ZlQWxsQ2hpbGRyZW4oZUdyaWRDZWxsKTtcbiAgICB2YXIgZUlucHV0LCBub2RlVG9BcHBlbmQ7XG5cbiAgICBpZiAoY29sdW1uLmNvbERlZi5lZGl0Q2VsbFJlbmRlcmVyKSB7XG4gICAgICAgIG5vZGVUb0FwcGVuZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgdmFyIGVkaXRDZWxsID0gdGhpcy51c2VFZGl0Q2VsbFJlbmRlcmVyKGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIHJvd0luZGV4LCB2YWx1ZUdldHRlcik7XG4gICAgICAgIGlmICh1dGlscy5pc05vZGVPckVsZW1lbnQoZWRpdENlbGwpKSB7XG4gICAgICAgICAgICBub2RlVG9BcHBlbmQuYXBwZW5kQ2hpbGQoZWRpdENlbGwpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlVG9BcHBlbmQuaW5uZXJIVE1MID0gZWRpdENlbGw7XG4gICAgICAgIH1cbiAgICAgICAgZUlucHV0ID0gbm9kZVRvQXBwZW5kLnF1ZXJ5U2VsZWN0b3IoJ2lucHV0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZUlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgZUlucHV0LnR5cGUgPSAndGV4dCc7XG4gICAgICAgIG5vZGVUb0FwcGVuZCA9IGVJbnB1dDtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZUlucHV0LCAnYWctY2VsbC1lZGl0LWlucHV0Jyk7XG5cbiAgICAgICAgaWYgKHZhbHVlR2V0dGVyKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB2YWx1ZUdldHRlcigpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBlSW5wdXQudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGVJbnB1dC5zdHlsZS53aWR0aCA9IChjb2x1bW4uYWN0dWFsV2lkdGggLSAxNCkgKyAncHgnO1xuICAgIH1cblxuICAgIGVHcmlkQ2VsbC5hcHBlbmRDaGlsZChub2RlVG9BcHBlbmQpO1xuICAgIGVJbnB1dC5mb2N1cygpO1xuICAgIGVJbnB1dC5zZWxlY3QoKTtcblxuICAgIHZhciBibHVyTGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhhdC5zdG9wRWRpdGluZyhlR3JpZENlbGwsIGNvbHVtbiwgbm9kZSwgJGNoaWxkU2NvcGUsIGVJbnB1dCwgYmx1ckxpc3RlbmVyLCByb3dJbmRleCwgaXNGaXJzdENvbHVtbiwgdmFsdWVHZXR0ZXIpO1xuICAgIH07XG5cbiAgICAvL3N0b3AgZW50ZXJpbmcgaWYgd2UgbG9vc2UgZm9jdXNcbiAgICBlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgYmx1ckxpc3RlbmVyKTtcblxuICAgIC8vc3RvcCBlZGl0aW5nIGlmIGVudGVyIHByZXNzZWRcbiAgICBlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICB2YXIga2V5ID0gZXZlbnQud2hpY2ggfHwgZXZlbnQua2V5Q29kZTtcbiAgICAgICAgLy8gMTMgaXMgZW50ZXJcbiAgICAgICAgaWYgKGtleSA9PSBjb25zdGFudHMuS0VZX0VOVEVSKSB7XG4gICAgICAgICAgICB0aGF0LnN0b3BFZGl0aW5nKGVHcmlkQ2VsbCwgY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgZUlucHV0LCBibHVyTGlzdGVuZXIsIHJvd0luZGV4LCBpc0ZpcnN0Q29sdW1uLCB2YWx1ZUdldHRlcik7XG4gICAgICAgICAgICB0aGF0LmZvY3VzQ2VsbChlR3JpZENlbGwsIHJvd0luZGV4LCBjb2x1bW4uaW5kZXgsIHRydWUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyB0YWIga2V5IGRvZXNuJ3QgZ2VuZXJhdGUga2V5cHJlc3MsIHNvIG5lZWQga2V5ZG93biB0byBsaXN0ZW4gZm9yIHRoYXRcbiAgICBlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIHZhciBrZXkgPSBldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlO1xuICAgICAgICBpZiAoa2V5ID09IGNvbnN0YW50cy5LRVlfVEFCKSB7XG4gICAgICAgICAgICB0aGF0LnN0b3BFZGl0aW5nKGVHcmlkQ2VsbCwgY29sdW1uLCBub2RlLCAkY2hpbGRTY29wZSwgZUlucHV0LCBibHVyTGlzdGVuZXIsIHJvd0luZGV4LCBpc0ZpcnN0Q29sdW1uLCB2YWx1ZUdldHRlcik7XG4gICAgICAgICAgICB0aGF0LnN0YXJ0RWRpdGluZ05leHRDZWxsKHJvd0luZGV4LCBjb2x1bW4sIGV2ZW50LnNoaWZ0S2V5KTtcbiAgICAgICAgICAgIC8vIHdlIGRvbid0IHdhbnQgdGhlIGRlZmF1bHQgdGFiIGFjdGlvbiwgc28gcmV0dXJuIGZhbHNlLCB0aGlzIHN0b3BzIHRoZSBldmVudCBmcm9tIGJ1YmJsaW5nXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5Sb3dSZW5kZXJlci5wcm90b3R5cGUuc3RhcnRFZGl0aW5nTmV4dENlbGwgPSBmdW5jdGlvbihyb3dJbmRleCwgY29sdW1uLCBzaGlmdEtleSkge1xuXG4gICAgdmFyIGZpcnN0Um93VG9DaGVjayA9IHRoaXMuZmlyc3RWaXJ0dWFsUmVuZGVyZWRSb3c7XG4gICAgdmFyIGxhc3RSb3dUb0NoZWNrID0gdGhpcy5sYXN0VmlydHVhbFJlbmRlcmVkUm93O1xuICAgIHZhciBjdXJyZW50Um93SW5kZXggPSByb3dJbmRleDtcblxuICAgIHZhciB2aXNpYmxlQ29sdW1ucyA9IHRoaXMuY29sdW1uTW9kZWwuZ2V0RGlzcGxheWVkQ29sdW1ucygpO1xuICAgIHZhciBjdXJyZW50Q29sID0gY29sdW1uO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICB2YXIgaW5kZXhPZkN1cnJlbnRDb2wgPSB2aXNpYmxlQ29sdW1ucy5pbmRleE9mKGN1cnJlbnRDb2wpO1xuXG4gICAgICAgIC8vIG1vdmUgYmFja3dhcmRcbiAgICAgICAgaWYgKHNoaWZ0S2V5KSB7XG4gICAgICAgICAgICAvLyBtb3ZlIGFsb25nIHRvIHRoZSBwcmV2aW91cyBjZWxsXG4gICAgICAgICAgICBjdXJyZW50Q29sID0gdmlzaWJsZUNvbHVtbnNbaW5kZXhPZkN1cnJlbnRDb2wgLSAxXTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGVuZCBvZiB0aGUgcm93LCBhbmQgaWYgc28sIGdvIGJhY2sgYSByb3dcbiAgICAgICAgICAgIGlmICghY3VycmVudENvbCkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRDb2wgPSB2aXNpYmxlQ29sdW1uc1t2aXNpYmxlQ29sdW1ucy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICBjdXJyZW50Um93SW5kZXgtLTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgZ290IHRvIGVuZCBvZiByZW5kZXJlZCByb3dzLCB0aGVuIHF1aXQgbG9va2luZ1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRSb3dJbmRleCA8IGZpcnN0Um93VG9DaGVjaykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIG1vdmUgZm9yd2FyZFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbW92ZSBhbG9uZyB0byB0aGUgbmV4dCBjZWxsXG4gICAgICAgICAgICBjdXJyZW50Q29sID0gdmlzaWJsZUNvbHVtbnNbaW5kZXhPZkN1cnJlbnRDb2wgKyAxXTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGVuZCBvZiB0aGUgcm93LCBhbmQgaWYgc28sIGdvIGZvcndhcmQgYSByb3dcbiAgICAgICAgICAgIGlmICghY3VycmVudENvbCkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRDb2wgPSB2aXNpYmxlQ29sdW1uc1swXTtcbiAgICAgICAgICAgICAgICBjdXJyZW50Um93SW5kZXgrKztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgZ290IHRvIGVuZCBvZiByZW5kZXJlZCByb3dzLCB0aGVuIHF1aXQgbG9va2luZ1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRSb3dJbmRleCA+IGxhc3RSb3dUb0NoZWNrKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5leHRGdW5jID0gdGhpcy5yZW5kZXJlZFJvd1N0YXJ0RWRpdGluZ0xpc3RlbmVyc1tjdXJyZW50Um93SW5kZXhdW2N1cnJlbnRDb2wuY29sSWRdO1xuICAgICAgICBpZiAobmV4dEZ1bmMpIHtcbiAgICAgICAgICAgIC8vIHNlZSBpZiB0aGUgbmV4dCBjZWxsIGlzIGVkaXRhYmxlLCBhbmQgaWYgc28sIHdlIGhhdmUgY29tZSB0b1xuICAgICAgICAgICAgLy8gdGhlIGVuZCBvZiBvdXIgc2VhcmNoLCBzbyBzdG9wIGxvb2tpbmcgZm9yIHRoZSBuZXh0IGNlbGxcbiAgICAgICAgICAgIHZhciBuZXh0Q2VsbEFjY2VwdGVkRWRpdCA9IG5leHRGdW5jKCk7XG4gICAgICAgICAgICBpZiAobmV4dENlbGxBY2NlcHRlZEVkaXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUm93UmVuZGVyZXI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbi8vIHRoZXNlIGNvbnN0YW50cyBhcmUgdXNlZCBmb3IgZGV0ZXJtaW5pbmcgaWYgZ3JvdXBzIHNob3VsZFxuLy8gYmUgc2VsZWN0ZWQgb3IgZGVzZWxlY3RlZCB3aGVuIHNlbGVjdGluZyBncm91cHMsIGFuZCB0aGUgZ3JvdXBcbi8vIHRoZW4gc2VsZWN0cyB0aGUgY2hpbGRyZW4uXG52YXIgU0VMRUNURUQgPSAwO1xudmFyIFVOU0VMRUNURUQgPSAxO1xudmFyIE1JWEVEID0gMjtcbnZhciBET19OT1RfQ0FSRSA9IDM7XG5cbmZ1bmN0aW9uIFNlbGVjdGlvbkNvbnRyb2xsZXIoKSB7fVxuXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oYW5ndWxhckdyaWQsIGdyaWRQYW5lbCwgZ3JpZE9wdGlvbnNXcmFwcGVyLCAkc2NvcGUsIHJvd1JlbmRlcmVyKSB7XG4gICAgdGhpcy5lUm93c1BhcmVudCA9IGdyaWRQYW5lbC5nZXRSb3dzUGFyZW50KCk7XG4gICAgdGhpcy5hbmd1bGFyR3JpZCA9IGFuZ3VsYXJHcmlkO1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xuICAgIHRoaXMuJHNjb3BlID0gJHNjb3BlO1xuICAgIHRoaXMucm93UmVuZGVyZXIgPSByb3dSZW5kZXJlcjtcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcblxuICAgIHRoaXMuaW5pdFNlbGVjdGVkTm9kZXNCeUlkKCk7XG5cbiAgICB0aGlzLnNlbGVjdGVkUm93cyA9IFtdO1xuICAgIGdyaWRPcHRpb25zV3JhcHBlci5zZXRTZWxlY3RlZFJvd3ModGhpcy5zZWxlY3RlZFJvd3MpO1xufTtcblxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuaW5pdFNlbGVjdGVkTm9kZXNCeUlkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZWxlY3RlZE5vZGVzQnlJZCA9IHt9O1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLnNldFNlbGVjdGVkTm9kZXNCeUlkKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQpO1xufTtcblxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuZ2V0U2VsZWN0ZWROb2RlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxlY3RlZE5vZGVzID0gW107XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLnNlbGVjdGVkTm9kZXNCeUlkKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGlkID0ga2V5c1tpXTtcbiAgICAgICAgdmFyIHNlbGVjdGVkTm9kZSA9IHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWRbaWRdO1xuICAgICAgICBzZWxlY3RlZE5vZGVzLnB1c2goc2VsZWN0ZWROb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGVjdGVkTm9kZXM7XG59O1xuXG4vLyByZXR1cm5zIGEgbGlzdCBvZiBhbGwgbm9kZXMgYXQgJ2Jlc3QgY29zdCcgLSBhIGZlYXR1cmUgdG8gYmUgdXNlZFxuLy8gd2l0aCBncm91cHMgLyB0cmVlcy4gaWYgYSBncm91cCBoYXMgYWxsIGl0J3MgY2hpbGRyZW4gc2VsZWN0ZWQsXG4vLyB0aGVuIHRoZSBncm91cCBhcHBlYXJzIGluIHRoZSByZXN1bHQsIGJ1dCBub3QgdGhlIGNoaWxkcmVuLlxuLy8gRGVzaWduZWQgZm9yIHVzZSB3aXRoICdjaGlsZHJlbicgYXMgdGhlIGdyb3VwIHNlbGVjdGlvbiB0eXBlLFxuLy8gd2hlcmUgZ3JvdXBzIGRvbid0IGFjdHVhbGx5IGFwcGVhciBpbiB0aGUgc2VsZWN0aW9uIG5vcm1hbGx5LlxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuZ2V0QmVzdENvc3ROb2RlU2VsZWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZiAodHlwZW9mIHRoaXMucm93TW9kZWwuZ2V0VG9wTGV2ZWxOb2RlcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyAnc2VsZWN0QWxsIG5vdCBhdmFpbGFibGUgd2hlbiByb3dzIGFyZSBvbiB0aGUgc2VydmVyJztcbiAgICB9XG5cbiAgICB2YXIgdG9wTGV2ZWxOb2RlcyA9IHRoaXMucm93TW9kZWwuZ2V0VG9wTGV2ZWxOb2RlcygpO1xuXG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgIC8vIHJlY3Vyc2l2ZSBmdW5jdGlvbiwgdG8gZmluZCB0aGUgc2VsZWN0ZWQgbm9kZXNcbiAgICBmdW5jdGlvbiB0cmF2ZXJzZShub2Rlcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vZGVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBub2Rlc1tpXTtcbiAgICAgICAgICAgIGlmICh0aGF0LmlzTm9kZVNlbGVjdGVkKG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gobm9kZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGlmIG5vdCBzZWxlY3RlZCwgdGhlbiBpZiBpdCdzIGEgZ3JvdXAsIGFuZCB0aGUgZ3JvdXBcbiAgICAgICAgICAgICAgICAvLyBoYXMgY2hpbGRyZW4sIGNvbnRpbnVlIHRvIHNlYXJjaCBmb3Igc2VsZWN0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmdyb3VwICYmIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2Uobm9kZS5jaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdHJhdmVyc2UodG9wTGV2ZWxOb2Rlcyk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuc2V0Um93TW9kZWwgPSBmdW5jdGlvbihyb3dNb2RlbCkge1xuICAgIHRoaXMucm93TW9kZWwgPSByb3dNb2RlbDtcbn07XG5cbi8vIHB1YmxpYyAtIHRoaXMgY2xlYXJzIHRoZSBzZWxlY3Rpb24sIGJ1dCBkb2Vzbid0IGNsZWFyIGRvd24gdGhlIGNzcyAtIHdoZW4gaXQgaXMgY2FsbGVkLCB0aGVcbi8vIGNhbGxlciB0aGVuIGdldHMgdGhlIGdyaWQgdG8gcmVmcmVzaC5cblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmRlc2VsZWN0QWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pbml0U2VsZWN0ZWROb2Rlc0J5SWQoKTtcbiAgICAvL3ZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5zZWxlY3RlZE5vZGVzQnlJZCk7XG4gICAgLy9mb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyAgICBkZWxldGUgdGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtrZXlzW2ldXTtcbiAgICAvL31cbiAgICB0aGlzLnN5bmNTZWxlY3RlZFJvd3NBbmRDYWxsTGlzdGVuZXIoKTtcbn07XG5cbi8vIHB1YmxpYyAtIHRoaXMgc2VsZWN0cyBldmVyeXRoaW5nLCBidXQgZG9lc24ndCBjbGVhciBkb3duIHRoZSBjc3MgLSB3aGVuIGl0IGlzIGNhbGxlZCwgdGhlXG4vLyBjYWxsZXIgdGhlbiBnZXRzIHRoZSBncmlkIHRvIHJlZnJlc2guXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5zZWxlY3RBbGwgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmICh0eXBlb2YgdGhpcy5yb3dNb2RlbC5nZXRUb3BMZXZlbE5vZGVzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93ICdzZWxlY3RBbGwgbm90IGF2YWlsYWJsZSB3aGVuIHJvd3MgYXJlIG9uIHRoZSBzZXJ2ZXInO1xuICAgIH1cblxuICAgIHZhciBzZWxlY3RlZE5vZGVzQnlJZCA9IHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQ7XG4gICAgLy8gaWYgdGhlIHNlbGVjdGlvbiBpcyBcImRvbid0IGluY2x1ZGUgZ3JvdXBzXCIsIHRoZW4gd2UgZG9uJ3QgaW5jbHVkZSB0aGVtIVxuICAgIHZhciBpbmNsdWRlR3JvdXBzID0gIXRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBTZWxlY3RzQ2hpbGRyZW4oKTtcblxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZWx5U2VsZWN0KG5vZGVzKSB7XG4gICAgICAgIGlmIChub2Rlcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGk8bm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZWx5U2VsZWN0KG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUdyb3Vwcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWROb2Rlc0J5SWRbbm9kZS5pZF0gPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWROb2Rlc0J5SWRbbm9kZS5pZF0gPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0b3BMZXZlbE5vZGVzID0gdGhpcy5yb3dNb2RlbC5nZXRUb3BMZXZlbE5vZGVzKCk7XG4gICAgcmVjdXJzaXZlbHlTZWxlY3QodG9wTGV2ZWxOb2Rlcyk7XG5cbiAgICB0aGlzLnN5bmNTZWxlY3RlZFJvd3NBbmRDYWxsTGlzdGVuZXIoKTtcbn07XG5cbi8vIHB1YmxpY1xuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuc2VsZWN0Tm9kZSA9IGZ1bmN0aW9uKG5vZGUsIHRyeU11bHRpLCBzdXBwcmVzc0V2ZW50cykge1xuICAgIHZhciBtdWx0aVNlbGVjdCA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzUm93U2VsZWN0aW9uTXVsdGkoKSAmJiB0cnlNdWx0aTtcblxuICAgIC8vIGlmIHRoZSBub2RlIGlzIGEgZ3JvdXAsIHRoZW4gc2VsZWN0aW5nIHRoaXMgaXMgdGhlIHNhbWUgYXMgc2VsZWN0aW5nIHRoZSBwYXJlbnQsXG4gICAgLy8gc28gdG8gaGF2ZSBvbmx5IG9uZSBmbG93IHRocm91Z2ggdGhlIGJlbG93LCB3ZSBhbHdheXMgc2VsZWN0IHRoZSBoZWFkZXIgcGFyZW50XG4gICAgLy8gKHdoaWNoIHRoZW4gaGFzIHRoZSBzaWRlIGVmZmVjdCBvZiBzZWxlY3RpbmcgdGhlIGNoaWxkKS5cbiAgICB2YXIgbm9kZVRvU2VsZWN0O1xuICAgIGlmIChub2RlLmZvb3Rlcikge1xuICAgICAgICBub2RlVG9TZWxlY3QgPSBub2RlLnNpYmxpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZVRvU2VsZWN0ID0gbm9kZTtcbiAgICB9XG5cbiAgICAvLyBhdCB0aGUgZW5kLCBpZiB0aGlzIGlzIHRydWUsIHdlIGluZm9ybSB0aGUgY2FsbGJhY2tcbiAgICB2YXIgYXRMZWFzdE9uZUl0ZW1VbnNlbGVjdGVkID0gZmFsc2U7XG4gICAgdmFyIGF0TGVhc3RPbmVJdGVtU2VsZWN0ZWQgPSBmYWxzZTtcblxuICAgIC8vIHNlZSBpZiByb3dzIHRvIGJlIGRlc2VsZWN0ZWRcbiAgICBpZiAoIW11bHRpU2VsZWN0KSB7XG4gICAgICAgIGF0TGVhc3RPbmVJdGVtVW5zZWxlY3RlZCA9IHRoaXMuZG9Xb3JrT2ZEZXNlbGVjdEFsbE5vZGVzKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmlzR3JvdXBTZWxlY3RzQ2hpbGRyZW4oKSAmJiBub2RlVG9TZWxlY3QuZ3JvdXApIHtcbiAgICAgICAgLy8gZG9uJ3Qgc2VsZWN0IHRoZSBncm91cCwgc2VsZWN0IHRoZSBjaGlsZHJlbiBpbnN0ZWFkXG4gICAgICAgIGF0TGVhc3RPbmVJdGVtU2VsZWN0ZWQgPSB0aGlzLnJlY3Vyc2l2ZWx5U2VsZWN0QWxsQ2hpbGRyZW4obm9kZVRvU2VsZWN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzZWUgaWYgcm93IG5lZWRzIHRvIGJlIHNlbGVjdGVkXG4gICAgICAgIGF0TGVhc3RPbmVJdGVtU2VsZWN0ZWQgPSB0aGlzLmRvV29ya09mU2VsZWN0Tm9kZShub2RlVG9TZWxlY3QsIHN1cHByZXNzRXZlbnRzKTtcbiAgICB9XG5cbiAgICBpZiAoYXRMZWFzdE9uZUl0ZW1VbnNlbGVjdGVkIHx8IGF0TGVhc3RPbmVJdGVtU2VsZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5zeW5jU2VsZWN0ZWRSb3dzQW5kQ2FsbExpc3RlbmVyKHN1cHByZXNzRXZlbnRzKTtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZUdyb3VwUGFyZW50c0lmTmVlZGVkKCk7XG59O1xuXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5yZWN1cnNpdmVseVNlbGVjdEFsbENoaWxkcmVuID0gZnVuY3Rpb24obm9kZSwgc3VwcHJlc3NFdmVudHMpIHtcbiAgICB2YXIgYXRMZWFzdE9uZSA9IGZhbHNlO1xuICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gbm9kZS5jaGlsZHJlbltpXTtcbiAgICAgICAgICAgIGlmIChjaGlsZC5ncm91cCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlY3Vyc2l2ZWx5U2VsZWN0QWxsQ2hpbGRyZW4oY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0TGVhc3RPbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZG9Xb3JrT2ZTZWxlY3ROb2RlKGNoaWxkLCBzdXBwcmVzc0V2ZW50cykpIHtcbiAgICAgICAgICAgICAgICAgICAgYXRMZWFzdE9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhdExlYXN0T25lO1xufTtcblxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUucmVjdXJzaXZlbHlEZXNlbGVjdEFsbENoaWxkcmVuID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gbm9kZS5jaGlsZHJlbltpXTtcbiAgICAgICAgICAgIGlmIChjaGlsZC5ncm91cCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVjdXJzaXZlbHlEZXNlbGVjdEFsbENoaWxkcmVuKGNoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kZXNlbGVjdFJlYWxOb2RlKGNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIHByaXZhdGVcbi8vIDEgLSBzZWxlY3RzIGEgbm9kZVxuLy8gMiAtIHVwZGF0ZXMgdGhlIFVJXG4vLyAzIC0gY2FsbHMgY2FsbGJhY2tzXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5kb1dvcmtPZlNlbGVjdE5vZGUgPSBmdW5jdGlvbihub2RlLCBzdXBwcmVzc0V2ZW50cykge1xuICAgIGlmICh0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW25vZGUuaWRdKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW25vZGUuaWRdID0gbm9kZTtcblxuICAgIHRoaXMuYWRkQ3NzQ2xhc3NGb3JOb2RlX2FuZEluZm9ybVZpcnR1YWxSb3dMaXN0ZW5lcihub2RlKTtcblxuICAgIC8vIGFsc28gY29sb3IgaW4gdGhlIGZvb3RlciBpZiB0aGVyZSBpcyBvbmVcbiAgICBpZiAobm9kZS5ncm91cCAmJiBub2RlLmV4cGFuZGVkICYmIG5vZGUuc2libGluZykge1xuICAgICAgICB0aGlzLmFkZENzc0NsYXNzRm9yTm9kZV9hbmRJbmZvcm1WaXJ0dWFsUm93TGlzdGVuZXIobm9kZS5zaWJsaW5nKTtcbiAgICB9XG5cbiAgICAvLyBpbmZvcm0gdGhlIHJvd1NlbGVjdGVkIGxpc3RlbmVyLCBpZiBhbnlcbiAgICBpZiAoIXN1cHByZXNzRXZlbnRzICYmIHR5cGVvZiB0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5nZXRSb3dTZWxlY3RlZCgpID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0Um93U2VsZWN0ZWQoKShub2RlLmRhdGEsIG5vZGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLy8gcHJpdmF0ZVxuLy8gMSAtIHNlbGVjdHMgYSBub2RlXG4vLyAyIC0gdXBkYXRlcyB0aGUgVUlcbi8vIDMgLSBjYWxscyBjYWxsYmFja3Ncbi8vIHdvdyAtIHdoYXQgYSBiaWcgbmFtZSBmb3IgYSBtZXRob2QsIGV4Y2VwdGlvbiBjYXNlLCBpdCdzIHNheWluZyB3aGF0IHRoZSBtZXRob2QgZG9lc1xuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUuYWRkQ3NzQ2xhc3NGb3JOb2RlX2FuZEluZm9ybVZpcnR1YWxSb3dMaXN0ZW5lciA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgdmlydHVhbFJlbmRlcmVkUm93SW5kZXggPSB0aGlzLnJvd1JlbmRlcmVyLmdldEluZGV4T2ZSZW5kZXJlZE5vZGUobm9kZSk7XG4gICAgaWYgKHZpcnR1YWxSZW5kZXJlZFJvd0luZGV4ID49IDApIHtcbiAgICAgICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9hZGRDc3NDbGFzcyh0aGlzLmVSb3dzUGFyZW50LCAnW3Jvdz1cIicgKyB2aXJ0dWFsUmVuZGVyZWRSb3dJbmRleCArICdcIl0nLCAnYWctcm93LXNlbGVjdGVkJyk7XG5cbiAgICAgICAgLy8gaW5mb3JtIHZpcnR1YWwgcm93IGxpc3RlbmVyXG4gICAgICAgIHRoaXMuYW5ndWxhckdyaWQub25WaXJ0dWFsUm93U2VsZWN0ZWQodmlydHVhbFJlbmRlcmVkUm93SW5kZXgsIHRydWUpO1xuICAgIH1cbn07XG5cbi8vIHByaXZhdGVcbi8vIDEgLSB1bi1zZWxlY3RzIGEgbm9kZVxuLy8gMiAtIHVwZGF0ZXMgdGhlIFVJXG4vLyAzIC0gY2FsbHMgY2FsbGJhY2tzXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5kb1dvcmtPZkRlc2VsZWN0QWxsTm9kZXMgPSBmdW5jdGlvbihub2RlVG9LZWVwU2VsZWN0ZWQpIHtcbiAgICAvLyBub3QgZG9pbmcgbXVsdGktc2VsZWN0LCBzbyBkZXNlbGVjdCBldmVyeXRoaW5nIG90aGVyIHRoYW4gdGhlICdqdXN0IHNlbGVjdGVkJyByb3dcbiAgICB2YXIgYXRMZWFzdE9uZVNlbGVjdGlvbkNoYW5nZTtcbiAgICB2YXIgc2VsZWN0ZWROb2RlS2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZWN0ZWROb2RlS2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBza2lwIHRoZSAnanVzdCBzZWxlY3RlZCcgcm93XG4gICAgICAgIHZhciBrZXkgPSBzZWxlY3RlZE5vZGVLZXlzW2ldO1xuICAgICAgICB2YXIgbm9kZVRvRGVzZWxlY3QgPSB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW2tleV07XG4gICAgICAgIGlmIChub2RlVG9EZXNlbGVjdCA9PT0gbm9kZVRvS2VlcFNlbGVjdGVkKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVzZWxlY3RSZWFsTm9kZShub2RlVG9EZXNlbGVjdCk7XG4gICAgICAgICAgICBhdExlYXN0T25lU2VsZWN0aW9uQ2hhbmdlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXRMZWFzdE9uZVNlbGVjdGlvbkNoYW5nZTtcbn07XG5cbi8vIHByaXZhdGVcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmRlc2VsZWN0UmVhbE5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgLy8gZGVzZWxlY3QgdGhlIGNzc1xuICAgIHRoaXMucmVtb3ZlQ3NzQ2xhc3NGb3JOb2RlKG5vZGUpO1xuXG4gICAgLy8gaWYgbm9kZSBpcyBhIGhlYWRlciwgYW5kIGlmIGl0IGhhcyBhIHNpYmxpbmcgZm9vdGVyLCBkZXNlbGVjdCB0aGUgZm9vdGVyIGFsc29cbiAgICBpZiAobm9kZS5ncm91cCAmJiBub2RlLmV4cGFuZGVkICYmIG5vZGUuc2libGluZykgeyAvLyBhbHNvIGNoZWNrIHRoYXQgaXQncyBleHBhbmRlZCwgYXMgc2libGluZyBjb3VsZCBiZSBhIGdob3N0XG4gICAgICAgIHRoaXMucmVtb3ZlQ3NzQ2xhc3NGb3JOb2RlKG5vZGUuc2libGluZyk7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIHRoZSByb3dcbiAgICBkZWxldGUgdGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtub2RlLmlkXTtcbn07XG5cbi8vIHByaXZhdGVcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnJlbW92ZUNzc0NsYXNzRm9yTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgdmlydHVhbFJlbmRlcmVkUm93SW5kZXggPSB0aGlzLnJvd1JlbmRlcmVyLmdldEluZGV4T2ZSZW5kZXJlZE5vZGUobm9kZSk7XG4gICAgaWYgKHZpcnR1YWxSZW5kZXJlZFJvd0luZGV4ID49IDApIHtcbiAgICAgICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9yZW1vdmVDc3NDbGFzcyh0aGlzLmVSb3dzUGFyZW50LCAnW3Jvdz1cIicgKyB2aXJ0dWFsUmVuZGVyZWRSb3dJbmRleCArICdcIl0nLCAnYWctcm93LXNlbGVjdGVkJyk7XG4gICAgICAgIC8vIGluZm9ybSB2aXJ0dWFsIHJvdyBsaXN0ZW5lclxuICAgICAgICB0aGlzLmFuZ3VsYXJHcmlkLm9uVmlydHVhbFJvd1NlbGVjdGVkKHZpcnR1YWxSZW5kZXJlZFJvd0luZGV4LCBmYWxzZSk7XG4gICAgfVxufTtcblxuLy8gcHVibGljIChzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkpXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5kZXNlbGVjdEluZGV4ID0gZnVuY3Rpb24ocm93SW5kZXgpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvdyhyb3dJbmRleCk7XG4gICAgdGhpcy5kZXNlbGVjdE5vZGUobm9kZSk7XG59O1xuXG4vLyBwdWJsaWMgKGFwaSlcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmRlc2VsZWN0Tm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZiAobm9kZSkge1xuICAgICAgICBpZiAodGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuaXNHcm91cFNlbGVjdHNDaGlsZHJlbigpICYmIG5vZGUuZ3JvdXApIHtcbiAgICAgICAgICAgIC8vIHdhbnQgdG8gZGVzZWxlY3QgY2hpbGRyZW4sIG5vdCB0aGlzIG5vZGUsIHNvIHJlY3Vyc2l2ZWx5IGRlc2VsZWN0XG4gICAgICAgICAgICB0aGlzLnJlY3Vyc2l2ZWx5RGVzZWxlY3RBbGxDaGlsZHJlbihub2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVzZWxlY3RSZWFsTm9kZShub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnN5bmNTZWxlY3RlZFJvd3NBbmRDYWxsTGlzdGVuZXIoKTtcbiAgICB0aGlzLnVwZGF0ZUdyb3VwUGFyZW50c0lmTmVlZGVkKCk7XG59O1xuXG4vLyBwdWJsaWMgKHNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeSAmIGFwaSlcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnNlbGVjdEluZGV4ID0gZnVuY3Rpb24oaW5kZXgsIHRyeU11bHRpLCBzdXBwcmVzc0V2ZW50cykge1xuICAgIHZhciBub2RlID0gdGhpcy5yb3dNb2RlbC5nZXRWaXJ0dWFsUm93KGluZGV4KTtcbiAgICB0aGlzLnNlbGVjdE5vZGUobm9kZSwgdHJ5TXVsdGksIHN1cHByZXNzRXZlbnRzKTtcbn07XG5cbi8vIHByaXZhdGVcbi8vIHVwZGF0ZXMgdGhlIHNlbGVjdGVkUm93cyB3aXRoIHRoZSBzZWxlY3RlZE5vZGVzIGFuZCBjYWxscyBzZWxlY3Rpb25DaGFuZ2VkIGxpc3RlbmVyXG5TZWxlY3Rpb25Db250cm9sbGVyLnByb3RvdHlwZS5zeW5jU2VsZWN0ZWRSb3dzQW5kQ2FsbExpc3RlbmVyID0gZnVuY3Rpb24oc3VwcHJlc3NFdmVudHMpIHtcbiAgICAvLyB1cGRhdGUgc2VsZWN0ZWQgcm93c1xuICAgIHZhciBzZWxlY3RlZFJvd3MgPSB0aGlzLnNlbGVjdGVkUm93cztcbiAgICB2YXIgb2xkQ291bnQgPSBzZWxlY3RlZFJvd3MubGVuZ3RoO1xuICAgIC8vIGNsZWFyIHNlbGVjdGVkIHJvd3NcbiAgICBzZWxlY3RlZFJvd3MubGVuZ3RoID0gMDtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2VsZWN0ZWROb2Rlc0J5SWQpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtrZXlzW2ldXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWROb2RlID0gdGhpcy5zZWxlY3RlZE5vZGVzQnlJZFtrZXlzW2ldXTtcbiAgICAgICAgICAgIHNlbGVjdGVkUm93cy5wdXNoKHNlbGVjdGVkTm9kZS5kYXRhKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHRoaXMgc3RvcGUgdGhlIGV2ZW50IGZpcmluZyB0aGUgdmVyeSBmaXJzdCB0aGUgdGltZSBncmlkIGlzIGluaXRpYWxpc2VkLiB3aXRob3V0IHRoaXMsIHRoZSBkb2N1bWVudGF0aW9uXG4gICAgLy8gcGFnZSBoYWQgYSBwb3B1cCBpbiB0aGUgJ3NlbGVjdGlvbicgcGFnZSBhcyBzb29uIGFzIHRoZSBwYWdlIHdhcyBsb2FkZWQhIVxuICAgIHZhciBub3RoaW5nQ2hhbmdlZE11c3RCZUluaXRpYWxpc2luZyA9IG9sZENvdW50ID09PSAwICYmIHNlbGVjdGVkUm93cy5sZW5ndGggPT09IDA7XG5cbiAgICBpZiAoIW5vdGhpbmdDaGFuZ2VkTXVzdEJlSW5pdGlhbGlzaW5nICYmICFzdXBwcmVzc0V2ZW50cyAmJiB0eXBlb2YgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0U2VsZWN0aW9uQ2hhbmdlZCgpID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0U2VsZWN0aW9uQ2hhbmdlZCgpKCk7XG4gICAgfVxuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICh0aGlzLiRzY29wZSkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhhdC4kc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgIH0sIDApO1xuICAgIH1cbn07XG5cbi8vIHByaXZhdGVcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLnJlY3Vyc2l2ZWx5Q2hlY2tJZlNlbGVjdGVkID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBmb3VuZFNlbGVjdGVkID0gZmFsc2U7XG4gICAgdmFyIGZvdW5kVW5zZWxlY3RlZCA9IGZhbHNlO1xuXG4gICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBub2RlLmNoaWxkcmVuW2ldO1xuICAgICAgICAgICAgdmFyIHJlc3VsdDtcbiAgICAgICAgICAgIGlmIChjaGlsZC5ncm91cCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMucmVjdXJzaXZlbHlDaGVja0lmU2VsZWN0ZWQoY2hpbGQpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU0VMRUNURUQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFVOU0VMRUNURUQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFVuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTUlYRUQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kVW5zZWxlY3RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIGNhbiBpZ25vcmUgdGhlIERPX05PVF9DQVJFLCBhcyBpdCBkb2Vzbid0IGltcGFjdCwgbWVhbnMgdGhlIGNoaWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBoYXMgbm8gY2hpbGRyZW4gYW5kIHNob3VsZG4ndCBiZSBjb25zaWRlcmVkIHdoZW4gZGVjaWRpbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzTm9kZVNlbGVjdGVkKGNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZFNlbGVjdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3VuZFVuc2VsZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZvdW5kU2VsZWN0ZWQgJiYgZm91bmRVbnNlbGVjdGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgbWl4ZWQsIHRoZW4gbm8gbmVlZCB0byBnbyBmdXJ0aGVyLCBqdXN0IHJldHVybiB1cCB0aGUgY2hhaW5cbiAgICAgICAgICAgICAgICByZXR1cm4gTUlYRUQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBnb3QgdGhpcyBmYXIsIHNvIG5vIGNvbmZsaWN0cywgZWl0aGVyIGFsbCBjaGlsZHJlbiBzZWxlY3RlZCwgdW5zZWxlY3RlZCwgb3IgbmVpdGhlclxuICAgIGlmIChmb3VuZFNlbGVjdGVkKSB7XG4gICAgICAgIHJldHVybiBTRUxFQ1RFRDtcbiAgICB9IGVsc2UgaWYgKGZvdW5kVW5zZWxlY3RlZCkge1xuICAgICAgICByZXR1cm4gVU5TRUxFQ1RFRDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRE9fTk9UX0NBUkU7XG4gICAgfVxufTtcblxuLy8gcHVibGljIChzZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkpXG4vLyByZXR1cm5zOlxuLy8gdHJ1ZTogaWYgc2VsZWN0ZWRcbi8vIGZhbHNlOiBpZiB1bnNlbGVjdGVkXG4vLyB1bmRlZmluZWQ6IGlmIGl0J3MgYSBncm91cCBhbmQgJ2NoaWxkcmVuIHNlbGVjdGlvbicgaXMgdXNlZCBhbmQgJ2NoaWxkcmVuJyBhcmUgYSBtaXggb2Ygc2VsZWN0ZWQgYW5kIHVuc2VsZWN0ZWRcblNlbGVjdGlvbkNvbnRyb2xsZXIucHJvdG90eXBlLmlzTm9kZVNlbGVjdGVkID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmICh0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwU2VsZWN0c0NoaWxkcmVuKCkgJiYgbm9kZS5ncm91cCkge1xuICAgICAgICAvLyBkb2luZyBjaGlsZCBzZWxlY3Rpb24sIHdlIG5lZWQgdG8gdHJhdmVyc2UgdGhlIGNoaWxkcmVuXG4gICAgICAgIHZhciByZXN1bHRPZkNoaWxkcmVuID0gdGhpcy5yZWN1cnNpdmVseUNoZWNrSWZTZWxlY3RlZChub2RlKTtcbiAgICAgICAgc3dpdGNoIChyZXN1bHRPZkNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjYXNlIFNFTEVDVEVEOlxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgY2FzZSBVTlNFTEVDVEVEOlxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNlbGVjdGVkTm9kZXNCeUlkW25vZGUuaWRdICE9PSB1bmRlZmluZWQ7XG4gICAgfVxufTtcblxuU2VsZWN0aW9uQ29udHJvbGxlci5wcm90b3R5cGUudXBkYXRlR3JvdXBQYXJlbnRzSWZOZWVkZWQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyB3ZSBvbmx5IGRvIHRoaXMgaWYgcGFyZW50IG5vZGVzIGFyZSByZXNwb25zaWJsZVxuICAgIC8vIGZvciBzZWxlY3RpbmcgdGhlaXIgY2hpbGRyZW4uXG4gICAgaWYgKCF0aGlzLmdyaWRPcHRpb25zV3JhcHBlci5pc0dyb3VwU2VsZWN0c0NoaWxkcmVuKCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBmaXJzdFJvdyA9IHRoaXMucm93UmVuZGVyZXIuZ2V0Rmlyc3RWaXJ0dWFsUmVuZGVyZWRSb3coKTtcbiAgICB2YXIgbGFzdFJvdyA9IHRoaXMucm93UmVuZGVyZXIuZ2V0TGFzdFZpcnR1YWxSZW5kZXJlZFJvdygpO1xuICAgIGZvciAodmFyIHJvd0luZGV4ID0gZmlyc3RSb3c7IHJvd0luZGV4IDw9IGxhc3RSb3c7IHJvd0luZGV4KyspIHtcbiAgICAgICAgLy8gc2VlIGlmIG5vZGUgaXMgYSBncm91cFxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMucm93TW9kZWwuZ2V0VmlydHVhbFJvdyhyb3dJbmRleCk7XG4gICAgICAgIGlmIChub2RlLmdyb3VwKSB7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWQgPSB0aGlzLmlzTm9kZVNlbGVjdGVkKG5vZGUpO1xuICAgICAgICAgICAgdGhpcy5hbmd1bGFyR3JpZC5vblZpcnR1YWxSb3dTZWxlY3RlZChyb3dJbmRleCwgc2VsZWN0ZWQpO1xuXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICB1dGlscy5xdWVyeVNlbGVjdG9yQWxsX2FkZENzc0NsYXNzKHRoaXMuZVJvd3NQYXJlbnQsICdbcm93PVwiJyArIHJvd0luZGV4ICsgJ1wiXScsICdhZy1yb3ctc2VsZWN0ZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXRpbHMucXVlcnlTZWxlY3RvckFsbF9yZW1vdmVDc3NDbGFzcyh0aGlzLmVSb3dzUGFyZW50LCAnW3Jvdz1cIicgKyByb3dJbmRleCArICdcIl0nLCAnYWctcm93LXNlbGVjdGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdGlvbkNvbnRyb2xsZXI7XG4iLCJmdW5jdGlvbiBTZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkoKSB7fVxuXG5TZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbihhbmd1bGFyR3JpZCwgc2VsZWN0aW9uQ29udHJvbGxlcikge1xuICAgIHRoaXMuYW5ndWxhckdyaWQgPSBhbmd1bGFyR3JpZDtcbiAgICB0aGlzLnNlbGVjdGlvbkNvbnRyb2xsZXIgPSBzZWxlY3Rpb25Db250cm9sbGVyO1xufTtcblxuU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVDaGVja2JveENvbERlZiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHdpZHRoOiAzMCxcbiAgICAgICAgc3VwcHJlc3NNZW51OiB0cnVlLFxuICAgICAgICBzdXBwcmVzc1NvcnRpbmc6IHRydWUsXG4gICAgICAgIGhlYWRlckNlbGxSZW5kZXJlcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZUNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgIGVDaGVja2JveC50eXBlID0gJ2NoZWNrYm94JztcbiAgICAgICAgICAgIGVDaGVja2JveC5uYW1lID0gJ25hbWUnO1xuICAgICAgICAgICAgcmV0dXJuIGVDaGVja2JveDtcbiAgICAgICAgfSxcbiAgICAgICAgY2VsbFJlbmRlcmVyOiB0aGlzLmNyZWF0ZUNoZWNrYm94UmVuZGVyZXIoKVxuICAgIH07XG59O1xuXG5TZWxlY3Rpb25SZW5kZXJlckZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUNoZWNrYm94UmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICByZXR1cm4gdGhhdC5jcmVhdGVTZWxlY3Rpb25DaGVja2JveChwYXJhbXMubm9kZSwgcGFyYW1zLnJvd0luZGV4KTtcbiAgICB9O1xufTtcblxuU2VsZWN0aW9uUmVuZGVyZXJGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVTZWxlY3Rpb25DaGVja2JveCA9IGZ1bmN0aW9uKG5vZGUsIHJvd0luZGV4KSB7XG5cbiAgICB2YXIgZUNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICBlQ2hlY2tib3gudHlwZSA9IFwiY2hlY2tib3hcIjtcbiAgICBlQ2hlY2tib3gubmFtZSA9IFwibmFtZVwiO1xuICAgIGVDaGVja2JveC5jbGFzc05hbWUgPSAnYWctc2VsZWN0aW9uLWNoZWNrYm94JztcbiAgICBzZXRDaGVja2JveFN0YXRlKGVDaGVja2JveCwgdGhpcy5zZWxlY3Rpb25Db250cm9sbGVyLmlzTm9kZVNlbGVjdGVkKG5vZGUpKTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBlQ2hlY2tib3gub25jbGljayA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH07XG5cbiAgICBlQ2hlY2tib3gub25jaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gZUNoZWNrYm94LmNoZWNrZWQ7XG4gICAgICAgIGlmIChuZXdWYWx1ZSkge1xuICAgICAgICAgICAgdGhhdC5zZWxlY3Rpb25Db250cm9sbGVyLnNlbGVjdEluZGV4KHJvd0luZGV4LCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoYXQuc2VsZWN0aW9uQ29udHJvbGxlci5kZXNlbGVjdEluZGV4KHJvd0luZGV4KTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLmFuZ3VsYXJHcmlkLmFkZFZpcnR1YWxSb3dMaXN0ZW5lcihyb3dJbmRleCwge1xuICAgICAgICByb3dTZWxlY3RlZDogZnVuY3Rpb24oc2VsZWN0ZWQpIHtcbiAgICAgICAgICAgIHNldENoZWNrYm94U3RhdGUoZUNoZWNrYm94LCBzZWxlY3RlZCk7XG4gICAgICAgIH0sXG4gICAgICAgIHJvd1JlbW92ZWQ6IGZ1bmN0aW9uKCkge31cbiAgICB9KTtcblxuICAgIHJldHVybiBlQ2hlY2tib3g7XG59O1xuXG5mdW5jdGlvbiBzZXRDaGVja2JveFN0YXRlKGVDaGVja2JveCwgc3RhdGUpIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgZUNoZWNrYm94LmNoZWNrZWQgPSBzdGF0ZTtcbiAgICAgICAgZUNoZWNrYm94LmluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpc05vZGVTZWxlY3RlZCByZXR1cm5zIGJhY2sgdW5kZWZpbmVkIGlmIGl0J3MgYSBncm91cCBhbmQgdGhlIGNoaWxkcmVuXG4gICAgICAgIC8vIGFyZSBhIG1peCBvZiBzZWxlY3RlZCBhbmQgdW5zZWxlY3RlZFxuICAgICAgICBlQ2hlY2tib3guaW5kZXRlcm1pbmF0ZSA9IHRydWU7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdGlvblJlbmRlcmVyRmFjdG9yeTtcbiIsInZhciBTVkdfTlMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI7XG5cbmZ1bmN0aW9uIFN2Z0ZhY3RvcnkoKSB7fVxuXG5TdmdGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVGaWx0ZXJTdmcgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZVN2ZyA9IGNyZWF0ZUljb25TdmcoKTtcblxuICAgIHZhciBlRnVubmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OUywgXCJwb2x5Z29uXCIpO1xuICAgIGVGdW5uZWwuc2V0QXR0cmlidXRlKFwicG9pbnRzXCIsIFwiMCwwIDQsNCA0LDEwIDYsMTAgNiw0IDEwLDBcIik7XG4gICAgZUZ1bm5lbC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCBcImFnLWhlYWRlci1pY29uXCIpO1xuICAgIGVTdmcuYXBwZW5kQ2hpbGQoZUZ1bm5lbCk7XG5cbiAgICByZXR1cm4gZVN2Zztcbn07XG5cblN2Z0ZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUNvbHVtblNob3dpbmdTdmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY3JlYXRlQ2lyY2xlKHRydWUpO1xufTtcblxuU3ZnRmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlQ29sdW1uSGlkZGVuU3ZnID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUNpcmNsZShmYWxzZSk7XG59O1xuXG5TdmdGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGVNZW51U3ZnID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVTdmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05TLCBcInN2Z1wiKTtcbiAgICB2YXIgc2l6ZSA9IFwiMTJcIjtcbiAgICBlU3ZnLnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIHNpemUpO1xuICAgIGVTdmcuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIHNpemUpO1xuXG4gICAgW1wiMFwiLCBcIjVcIiwgXCIxMFwiXS5mb3JFYWNoKGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgdmFyIGVMaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFNWR19OUywgXCJyZWN0XCIpO1xuICAgICAgICBlTGluZS5zZXRBdHRyaWJ1dGUoXCJ5XCIsIHkpO1xuICAgICAgICBlTGluZS5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBzaXplKTtcbiAgICAgICAgZUxpbmUuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIFwiMlwiKTtcbiAgICAgICAgZUxpbmUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgXCJhZy1oZWFkZXItaWNvblwiKTtcbiAgICAgICAgZVN2Zy5hcHBlbmRDaGlsZChlTGluZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZVN2Zztcbn07XG5cblN2Z0ZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUFycm93VXBTdmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY3JlYXRlUG9seWdvblN2ZyhcIjAsMTAgNSwwIDEwLDEwXCIpO1xufTtcblxuU3ZnRmFjdG9yeS5wcm90b3R5cGUuY3JlYXRlQXJyb3dMZWZ0U3ZnID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNyZWF0ZVBvbHlnb25TdmcoXCIxMCwwIDAsNSAxMCwxMFwiKTtcbn07XG5cblN2Z0ZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUFycm93RG93blN2ZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjcmVhdGVQb2x5Z29uU3ZnKFwiMCwwIDUsMTAgMTAsMFwiKTtcbn07XG5cblN2Z0ZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZUFycm93UmlnaHRTdmcgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY3JlYXRlUG9seWdvblN2ZyhcIjAsMCAxMCw1IDAsMTBcIik7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVQb2x5Z29uU3ZnKHBvaW50cykge1xuICAgIHZhciBlU3ZnID0gY3JlYXRlSWNvblN2ZygpO1xuXG4gICAgdmFyIGVEZXNjSWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTlMsIFwicG9seWdvblwiKTtcbiAgICBlRGVzY0ljb24uc2V0QXR0cmlidXRlKFwicG9pbnRzXCIsIHBvaW50cyk7XG4gICAgZVN2Zy5hcHBlbmRDaGlsZChlRGVzY0ljb24pO1xuXG4gICAgcmV0dXJuIGVTdmc7XG59XG5cbi8vIHV0aWwgZnVuY3Rpb24gZm9yIHRoZSBhYm92ZVxuZnVuY3Rpb24gY3JlYXRlSWNvblN2ZygpIHtcbiAgICB2YXIgZVN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhTVkdfTlMsIFwic3ZnXCIpO1xuICAgIGVTdmcuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgXCIxMFwiKTtcbiAgICBlU3ZnLnNldEF0dHJpYnV0ZShcImhlaWdodFwiLCBcIjEwXCIpO1xuICAgIHJldHVybiBlU3ZnO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVDaXJjbGUoZmlsbCkge1xuICAgIHZhciBlU3ZnID0gY3JlYXRlSWNvblN2ZygpO1xuXG4gICAgdmFyIGVDaXJjbGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoU1ZHX05TLCBcImNpcmNsZVwiKTtcbiAgICBlQ2lyY2xlLnNldEF0dHJpYnV0ZShcImN4XCIsIFwiNVwiKTtcbiAgICBlQ2lyY2xlLnNldEF0dHJpYnV0ZShcImN5XCIsIFwiNVwiKTtcbiAgICBlQ2lyY2xlLnNldEF0dHJpYnV0ZShcInJcIiwgXCI1XCIpO1xuICAgIGVDaXJjbGUuc2V0QXR0cmlidXRlKFwic3Ryb2tlXCIsIFwiYmxhY2tcIik7XG4gICAgZUNpcmNsZS5zZXRBdHRyaWJ1dGUoXCJzdHJva2Utd2lkdGhcIiwgXCIyXCIpO1xuICAgIGlmIChmaWxsKSB7XG4gICAgICAgIGVDaXJjbGUuc2V0QXR0cmlidXRlKFwiZmlsbFwiLCBcImJsYWNrXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVDaXJjbGUuc2V0QXR0cmlidXRlKFwiZmlsbFwiLCBcIm5vbmVcIik7XG4gICAgfVxuICAgIGVTdmcuYXBwZW5kQ2hpbGQoZUNpcmNsZSk7XG5cbiAgICByZXR1cm4gZVN2Zztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3ZnRmFjdG9yeTtcbiIsIlxuZnVuY3Rpb24gVGVtcGxhdGVTZXJ2aWNlKCkge1xuICAgIHRoaXMudGVtcGxhdGVDYWNoZSA9IHt9O1xuICAgIHRoaXMud2FpdGluZ0NhbGxiYWNrcyA9IHt9O1xufVxuXG5UZW1wbGF0ZVNlcnZpY2UucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICAgdGhpcy4kc2NvcGUgPSAkc2NvcGU7XG59O1xuXG4vLyByZXR1cm5zIHRoZSB0ZW1wbGF0ZSBpZiBpdCBpcyBsb2FkZWQsIG9yIG51bGwgaWYgaXQgaXMgbm90IGxvYWRlZFxuLy8gYnV0IHdpbGwgY2FsbCB0aGUgY2FsbGJhY2sgd2hlbiBpdCBpcyBsb2FkZWRcblRlbXBsYXRlU2VydmljZS5wcm90b3R5cGUuZ2V0VGVtcGxhdGUgPSBmdW5jdGlvbiAodXJsLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIHRlbXBsYXRlRnJvbUNhY2hlID0gdGhpcy50ZW1wbGF0ZUNhY2hlW3VybF07XG4gICAgaWYgKHRlbXBsYXRlRnJvbUNhY2hlKSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZUZyb21DYWNoZTtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2tMaXN0ID0gdGhpcy53YWl0aW5nQ2FsbGJhY2tzW3VybF07XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGlmICghY2FsbGJhY2tMaXN0KSB7XG4gICAgICAgIC8vIGZpcnN0IHRpbWUgdGhpcyB3YXMgY2FsbGVkLCBzbyBuZWVkIGEgbmV3IGxpc3QgZm9yIGNhbGxiYWNrc1xuICAgICAgICBjYWxsYmFja0xpc3QgPSBbXTtcbiAgICAgICAgdGhpcy53YWl0aW5nQ2FsbGJhY2tzW3VybF0gPSBjYWxsYmFja0xpc3Q7XG4gICAgICAgIC8vIGFuZCBhbHNvIG5lZWQgdG8gZG8gdGhlIGh0dHAgcmVxdWVzdFxuICAgICAgICB2YXIgY2xpZW50ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIGNsaWVudC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7IHRoYXQuaGFuZGxlSHR0cFJlc3VsdCh0aGlzLCB1cmwpOyB9O1xuICAgICAgICBjbGllbnQub3BlbihcIkdFVFwiLCB1cmwpO1xuICAgICAgICBjbGllbnQuc2VuZCgpO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGlzIGNhbGxiYWNrXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrTGlzdC5wdXNoKGNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBjYWxsZXIgbmVlZHMgdG8gd2FpdCBmb3IgdGVtcGxhdGUgdG8gbG9hZCwgc28gcmV0dXJuIG51bGxcbiAgICByZXR1cm4gbnVsbDtcbn07XG5cblRlbXBsYXRlU2VydmljZS5wcm90b3R5cGUuaGFuZGxlSHR0cFJlc3VsdCA9IGZ1bmN0aW9uIChodHRwUmVzdWx0LCB1cmwpIHtcblxuICAgIGlmIChodHRwUmVzdWx0LnN0YXR1cyAhPT0gMjAwIHx8IGh0dHBSZXN1bHQucmVzcG9uc2UgPT09IG51bGwpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdVbmFibGUgdG8gZ2V0IHRlbXBsYXRlIGVycm9yICcgKyBodHRwUmVzdWx0LnN0YXR1cyArICcgLSAnICsgdXJsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHJlc3BvbnNlIHN1Y2Nlc3MsIHNvIHByb2Nlc3MgaXRcbiAgICB0aGlzLnRlbXBsYXRlQ2FjaGVbdXJsXSA9IGh0dHBSZXN1bHQucmVzcG9uc2U7XG5cbiAgICAvLyBpbmZvcm0gYWxsIGxpc3RlbmVycyB0aGF0IHRoaXMgaXMgbm93IGluIHRoZSBjYWNoZVxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLndhaXRpbmdDYWxsYmFja3NbdXJsXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBjYWxsYmFja3NbaV07XG4gICAgICAgIC8vIHdlIGNvdWxkIHBhc3MgdGhlIGNhbGxiYWNrIHRoZSByZXNwb25zZSwgaG93ZXZlciB3ZSBrbm93IHRoZSBjbGllbnQgb2YgdGhpcyBjb2RlXG4gICAgICAgIC8vIGlzIHRoZSBjZWxsIHJlbmRlcmVyLCBhbmQgaXQgcGFzc2VzIHRoZSAnY2VsbFJlZnJlc2gnIG1ldGhvZCBpbiBhcyB0aGUgY2FsbGJhY2tcbiAgICAgICAgLy8gd2hpY2ggZG9lc24ndCB0YWtlIGFueSBwYXJhbWV0ZXJzLlxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLiRzY29wZSkge1xuICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGF0LiRzY29wZS4kYXBwbHkoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZVNlcnZpY2U7XG4iLCJ2YXIgQ2hlY2tib3hTZWxlY3Rpb24gPSByZXF1aXJlKFwiLi4vd2lkZ2V0cy9jaGVja2JveFNlbGVjdGlvblwiKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBCb3JkZXJMYXlvdXQgPSByZXF1aXJlKCcuLi9sYXlvdXQvQm9yZGVyTGF5b3V0Jyk7XG52YXIgU3ZnRmFjdG9yeSA9IHJlcXVpcmUoJy4uL3N2Z0ZhY3RvcnknKTtcblxudmFyIHN2Z0ZhY3RvcnkgPSBuZXcgU3ZnRmFjdG9yeSgpO1xuXG5mdW5jdGlvbiBDb2x1bW5TZWxlY3Rpb25QYW5lbChjb2x1bW5Db250cm9sbGVyLCBncmlkT3B0aW9uc1dyYXBwZXIpIHtcbiAgICB0aGlzLmdyaWRPcHRpb25zV3JhcHBlciA9IGdyaWRPcHRpb25zV3JhcHBlcjtcbiAgICB0aGlzLnNldHVwQ29tcG9uZW50cygpO1xuICAgIHRoaXMuY29sdW1uQ29udHJvbGxlciA9IGNvbHVtbkNvbnRyb2xsZXI7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5jb2x1bW5Db250cm9sbGVyLmFkZExpc3RlbmVyKHtcbiAgICAgICAgY29sdW1uc0NoYW5nZWQ6IHRoYXQuY29sdW1uc0NoYW5nZWQuYmluZCh0aGF0KVxuICAgIH0pO1xufVxuXG5Db2x1bW5TZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuY29sdW1uc0NoYW5nZWQgPSBmdW5jdGlvbihuZXdDb2x1bW5zKSB7XG4gICAgdGhpcy5jQ29sdW1uTGlzdC5zZXRNb2RlbChuZXdDb2x1bW5zKTtcbn07XG5cbkNvbHVtblNlbGVjdGlvblBhbmVsLnByb3RvdHlwZS5nZXRDb2x1bW5MaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY0NvbHVtbkxpc3Q7XG59O1xuXG5Db2x1bW5TZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuY29sdW1uQ2VsbFJlbmRlcmVyID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIGNvbHVtbiA9IHBhcmFtcy52YWx1ZTtcbiAgICB2YXIgY29sRGlzcGxheU5hbWUgPSB0aGlzLmNvbHVtbkNvbnRyb2xsZXIuZ2V0RGlzcGxheU5hbWVGb3JDb2woY29sdW1uKTtcblxuICAgIHZhciBlUmVzdWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuXG4gICAgdmFyIGVWaXNpYmxlSWNvbnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVZpc2libGVJY29ucywgJ2FnLXZpc2libGUtaWNvbnMnKTtcbiAgICB2YXIgZVNob3dpbmcgPSB1dGlscy5jcmVhdGVJY29uKCdjb2x1bW5WaXNpYmxlJywgdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIsIGNvbHVtbiwgc3ZnRmFjdG9yeS5jcmVhdGVDb2x1bW5TaG93aW5nU3ZnKTtcbiAgICB2YXIgZUhpZGRlbiA9IHV0aWxzLmNyZWF0ZUljb24oJ2NvbHVtbkhpZGRlbicsIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW4sIHN2Z0ZhY3RvcnkuY3JlYXRlQ29sdW1uSGlkZGVuU3ZnKTtcbiAgICBlVmlzaWJsZUljb25zLmFwcGVuZENoaWxkKGVTaG93aW5nKTtcbiAgICBlVmlzaWJsZUljb25zLmFwcGVuZENoaWxkKGVIaWRkZW4pO1xuICAgIGVTaG93aW5nLnN0eWxlLmRpc3BsYXkgPSBjb2x1bW4udmlzaWJsZSA/ICcnIDogJ25vbmUnO1xuICAgIGVIaWRkZW4uc3R5bGUuZGlzcGxheSA9IGNvbHVtbi52aXNpYmxlID8gJ25vbmUnIDogJyc7XG4gICAgZVJlc3VsdC5hcHBlbmRDaGlsZChlVmlzaWJsZUljb25zKTtcblxuICAgIHZhciBlVmFsdWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgZVZhbHVlLmlubmVySFRNTCA9IGNvbERpc3BsYXlOYW1lO1xuICAgIGVSZXN1bHQuYXBwZW5kQ2hpbGQoZVZhbHVlKTtcblxuICAgIGlmICghY29sdW1uLnZpc2libGUpIHtcbiAgICAgICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVJlc3VsdCwgJ2FnLWNvbHVtbi1ub3QtdmlzaWJsZScpO1xuICAgIH1cblxuICAgIC8vIGNoYW5nZSB2aXNpYmxlIGlmIHVzZSBjbGlja3MgdGhlIHZpc2libGUgaWNvbiwgb3IgaWYgcm93IGlzIGRvdWJsZSBjbGlja2VkXG4gICAgZVZpc2libGVJY29ucy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHNob3dFdmVudExpc3RlbmVyKTtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBmdW5jdGlvbiBzaG93RXZlbnRMaXN0ZW5lcigpIHtcbiAgICAgICAgY29sdW1uLnZpc2libGUgPSAhY29sdW1uLnZpc2libGU7XG4gICAgICAgIHRoYXQuY0NvbHVtbkxpc3QucmVmcmVzaFZpZXcoKTtcbiAgICAgICAgdGhhdC5jb2x1bW5Db250cm9sbGVyLm9uQ29sdW1uU3RhdGVDaGFuZ2VkKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVSZXN1bHQ7XG59O1xuXG5Db2x1bW5TZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuc2V0dXBDb21wb25lbnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLmNDb2x1bW5MaXN0ID0gbmV3IENoZWNrYm94U2VsZWN0aW9uKCk7XG4gICAgdGhpcy5jQ29sdW1uTGlzdC5zZXRDZWxsUmVuZGVyZXIodGhpcy5jb2x1bW5DZWxsUmVuZGVyZXIuYmluZCh0aGlzKSk7XG5cbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdGhpcy5jQ29sdW1uTGlzdC5hZGRNb2RlbENoYW5nZWRMaXN0ZW5lciggZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoYXQuY29sdW1uQ29udHJvbGxlci5vbkNvbHVtblN0YXRlQ2hhbmdlZCgpO1xuICAgIH0pO1xuXG4gICAgdmFyIGxvY2FsZVRleHRGdW5jID0gdGhpcy5ncmlkT3B0aW9uc1dyYXBwZXIuZ2V0TG9jYWxlVGV4dEZ1bmMoKTtcbiAgICB2YXIgY29sdW1uc0xvY2FsVGV4dCA9IGxvY2FsZVRleHRGdW5jKCdjb2x1bW5zJywgJ0NvbHVtbnMnKTtcblxuICAgIHZhciBlTm9ydGhQYW5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVOb3J0aFBhbmVsLmlubmVySFRNTCA9ICc8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogY2VudGVyO1wiPicrY29sdW1uc0xvY2FsVGV4dCsnPC9kaXY+JztcblxuICAgIHRoaXMubGF5b3V0ID0gbmV3IEJvcmRlckxheW91dCh7XG4gICAgICAgIGNlbnRlcjogdGhpcy5jQ29sdW1uTGlzdC5nZXRHdWkoKSxcbiAgICAgICAgbm9ydGg6IGVOb3J0aFBhbmVsXG4gICAgfSk7XG59O1xuXG4vLyBub3Qgc3VyZSBpZiB0aGlzIGlzIGNhbGxlZCBhbnl3aGVyZVxuQ29sdW1uU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLnNldFNlbGVjdGVkID0gZnVuY3Rpb24oY29sdW1uLCBzZWxlY3RlZCkge1xuICAgIGNvbHVtbi52aXNpYmxlID0gc2VsZWN0ZWQ7XG4gICAgdGhpcy5jb2x1bW5Db250cm9sbGVyLm9uQ29sdW1uU3RhdGVDaGFuZ2VkKCk7XG59O1xuXG5Db2x1bW5TZWxlY3Rpb25QYW5lbC5wcm90b3R5cGUuZ2V0R3VpID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZVJvb3RQYW5lbC5nZXRHdWkoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sdW1uU2VsZWN0aW9uUGFuZWw7XG4iLCJ2YXIgQ2hlY2tib3hTZWxlY3Rpb24gPSByZXF1aXJlKFwiLi4vd2lkZ2V0cy9jaGVja2JveFNlbGVjdGlvblwiKTtcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCcuLi9jb25zdGFudHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgQm9yZGVyTGF5b3V0ID0gcmVxdWlyZSgnLi4vbGF5b3V0L2JvcmRlckxheW91dCcpO1xudmFyIFN2Z0ZhY3RvcnkgPSByZXF1aXJlKCcuLi9zdmdGYWN0b3J5Jyk7XG5cbnZhciBzdmdGYWN0b3J5ID0gbmV3IFN2Z0ZhY3RvcnkoKTtcblxuZnVuY3Rpb24gR3JvdXBTZWxlY3Rpb25QYW5lbChjb2x1bW5Db250cm9sbGVyLCBpbk1lbW9yeVJvd0NvbnRyb2xsZXIsIGdyaWRPcHRpb25zV3JhcHBlcikge1xuICAgIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyID0gZ3JpZE9wdGlvbnNXcmFwcGVyO1xuICAgIHRoaXMuc2V0dXBDb21wb25lbnRzKCk7XG4gICAgdGhpcy5jb2x1bW5Db250cm9sbGVyID0gY29sdW1uQ29udHJvbGxlcjtcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlciA9IGluTWVtb3J5Um93Q29udHJvbGxlcjtcblxuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB0aGlzLmNvbHVtbkNvbnRyb2xsZXIuYWRkTGlzdGVuZXIoe1xuICAgICAgICBjb2x1bW5zQ2hhbmdlZDogdGhhdC5jb2x1bW5zQ2hhbmdlZC5iaW5kKHRoYXQpXG4gICAgfSk7XG59XG5cbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmNvbHVtbnNDaGFuZ2VkID0gZnVuY3Rpb24obmV3Q29sdW1ucywgbmV3R3JvdXBlZENvbHVtbnMpIHtcbiAgICB0aGlzLmNDb2x1bW5MaXN0LnNldE1vZGVsKG5ld0dyb3VwZWRDb2x1bW5zKTtcbn07XG5cbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmdldENvbHVtbkxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5jQ29sdW1uTGlzdDtcbn07XG5cbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmNvbHVtbkNlbGxSZW5kZXJlciA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBjb2x1bW4gPSBwYXJhbXMudmFsdWU7XG4gICAgdmFyIGNvbERpc3BsYXlOYW1lID0gdGhpcy5jb2x1bW5Db250cm9sbGVyLmdldERpc3BsYXlOYW1lRm9yQ29sKGNvbHVtbik7XG5cbiAgICB2YXIgZVJlc3VsdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcblxuICAgIHZhciBlUmVtb3ZlID0gdXRpbHMuY3JlYXRlSWNvbignY29sdW1uUmVtb3ZlRnJvbUdyb3VwSWNvbicsIHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2x1bW4sIHN2Z0ZhY3RvcnkuY3JlYXRlQXJyb3dVcFN2Zyk7XG4gICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZVJlbW92ZSwgJ2FnLXZpc2libGUtaWNvbnMnKTtcbiAgICBlUmVzdWx0LmFwcGVuZENoaWxkKGVSZW1vdmUpO1xuXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIGVSZW1vdmUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtb2RlbCA9IHRoYXQuY0NvbHVtbkxpc3QuZ2V0TW9kZWwoKTtcbiAgICAgICAgbW9kZWwuc3BsaWNlKG1vZGVsLmluZGV4T2YoY29sdW1uKSwgMSk7XG4gICAgICAgIHRoYXQuY0NvbHVtbkxpc3Quc2V0TW9kZWwobW9kZWwpO1xuICAgICAgICB0aGF0Lm9uR3JvdXBpbmdDaGFuZ2VkKCk7XG4gICAgfSk7XG5cbiAgICB2YXIgZVZhbHVlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIGVWYWx1ZS5pbm5lckhUTUwgPSBjb2xEaXNwbGF5TmFtZTtcbiAgICBlUmVzdWx0LmFwcGVuZENoaWxkKGVWYWx1ZSk7XG5cbiAgICByZXR1cm4gZVJlc3VsdDtcbn07XG5cbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLnNldHVwQ29tcG9uZW50cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsb2NhbGVUZXh0RnVuYyA9IHRoaXMuZ3JpZE9wdGlvbnNXcmFwcGVyLmdldExvY2FsZVRleHRGdW5jKCk7XG4gICAgdmFyIGNvbHVtbnNMb2NhbFRleHQgPSBsb2NhbGVUZXh0RnVuYygncGl2b3RlZENvbHVtbnMnLCAnUGl2b3RlZCBDb2x1bW5zJyk7XG4gICAgdmFyIHBpdm90ZWRDb2x1bW5zRW1wdHlNZXNzYWdlID0gbG9jYWxlVGV4dEZ1bmMoJ3Bpdm90ZWRDb2x1bW5zRW1wdHlNZXNzYWdlJywgJ0RyYWcgY29sdW1ucyBkb3duIGZyb20gYWJvdmUgdG8gcGl2b3QgYnkgdGhvc2UgY29sdW1ucycpO1xuXG4gICAgdGhpcy5jQ29sdW1uTGlzdCA9IG5ldyBDaGVja2JveFNlbGVjdGlvbigpO1xuICAgIHRoaXMuY0NvbHVtbkxpc3Quc2V0Q2VsbFJlbmRlcmVyKHRoaXMuY29sdW1uQ2VsbFJlbmRlcmVyLmJpbmQodGhpcykpO1xuICAgIHRoaXMuY0NvbHVtbkxpc3QuYWRkTW9kZWxDaGFuZ2VkTGlzdGVuZXIodGhpcy5vbkdyb3VwaW5nQ2hhbmdlZC5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNDb2x1bW5MaXN0LnNldEVtcHR5TWVzc2FnZShwaXZvdGVkQ29sdW1uc0VtcHR5TWVzc2FnZSk7XG5cbiAgICB2YXIgZU5vcnRoUGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlTm9ydGhQYW5lbC5zdHlsZS5wYWRkaW5nVG9wID0gJzEwcHgnO1xuICAgIGVOb3J0aFBhbmVsLmlubmVySFRNTCA9ICc8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogY2VudGVyO1wiPicrY29sdW1uc0xvY2FsVGV4dCsnPC9kaXY+JztcblxuICAgIHRoaXMubGF5b3V0ID0gbmV3IEJvcmRlckxheW91dCh7XG4gICAgICAgIGNlbnRlcjogdGhpcy5jQ29sdW1uTGlzdC5nZXRHdWkoKSxcbiAgICAgICAgbm9ydGg6IGVOb3J0aFBhbmVsXG4gICAgfSk7XG59O1xuXG5Hcm91cFNlbGVjdGlvblBhbmVsLnByb3RvdHlwZS5vbkdyb3VwaW5nQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5NZW1vcnlSb3dDb250cm9sbGVyLmRvR3JvdXBpbmcoKTtcbiAgICB0aGlzLmluTWVtb3J5Um93Q29udHJvbGxlci51cGRhdGVNb2RlbChjb25zdGFudHMuU1RFUF9FVkVSWVRISU5HKTtcbiAgICB0aGlzLmNvbHVtbkNvbnRyb2xsZXIub25Db2x1bW5TdGF0ZUNoYW5nZWQoKTtcbn07XG5cbkdyb3VwU2VsZWN0aW9uUGFuZWwucHJvdG90eXBlLmdldEd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmVSb290UGFuZWwuZ2V0R3VpKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwU2VsZWN0aW9uUGFuZWw7IiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcbnZhciBDb2x1bW5TZWxlY3Rpb25QYW5lbCA9IHJlcXVpcmUoJy4vY29sdW1uU2VsZWN0aW9uUGFuZWwnKTtcbnZhciBHcm91cFNlbGVjdGlvblBhbmVsID0gcmVxdWlyZSgnLi9ncm91cFNlbGVjdGlvblBhbmVsJyk7XG52YXIgVmVydGljYWxTdGFjayA9IHJlcXVpcmUoJy4uL2xheW91dC92ZXJ0aWNhbFN0YWNrJyk7XG5cbmZ1bmN0aW9uIFRvb2xQYW5lbCgpIHtcbiAgICB0aGlzLmxheW91dCA9IG5ldyBWZXJ0aWNhbFN0YWNrKCk7XG59XG5cblRvb2xQYW5lbC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGNvbHVtbkNvbnRyb2xsZXIsIGluTWVtb3J5Um93Q29udHJvbGxlciwgZ3JpZE9wdGlvbnNXcmFwcGVyKSB7XG5cbiAgICB2YXIgY29sdW1uU2VsZWN0aW9uUGFuZWwgPSBuZXcgQ29sdW1uU2VsZWN0aW9uUGFuZWwoY29sdW1uQ29udHJvbGxlciwgZ3JpZE9wdGlvbnNXcmFwcGVyKTtcbiAgICB0aGlzLmxheW91dC5hZGRQYW5lbChjb2x1bW5TZWxlY3Rpb25QYW5lbC5sYXlvdXQsICc1MCUnKTtcbiAgICB2YXIgZ3JvdXBTZWxlY3Rpb25QYW5lbCA9IG5ldyBHcm91cFNlbGVjdGlvblBhbmVsKGNvbHVtbkNvbnRyb2xsZXIsIGluTWVtb3J5Um93Q29udHJvbGxlciwgZ3JpZE9wdGlvbnNXcmFwcGVyKTtcbiAgICB0aGlzLmxheW91dC5hZGRQYW5lbChncm91cFNlbGVjdGlvblBhbmVsLmxheW91dCwgJzUwJScpO1xuXG4gICAgZ3JvdXBTZWxlY3Rpb25QYW5lbC5nZXRDb2x1bW5MaXN0KCkuYWRkRHJhZ1NvdXJjZShjb2x1bW5TZWxlY3Rpb25QYW5lbC5nZXRDb2x1bW5MaXN0KCkuZ2V0VW5pcXVlSWQoKSk7XG5cbiAgICB2YXIgZUd1aSA9IHRoaXMubGF5b3V0LmdldEd1aSgpO1xuXG4gICAgdXRpbHMuYWRkQ3NzQ2xhc3MoZUd1aSwgJ2FnLXRvb2wtcGFuZWwtY29udGFpbmVyJyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvb2xQYW5lbDtcbiIsImZ1bmN0aW9uIFV0aWxzKCkge31cblxudmFyIEZVTkNUSU9OX1NUUklQX0NPTU1FTlRTID0gLygoXFwvXFwvLiokKXwoXFwvXFwqW1xcc1xcU10qP1xcKlxcLykpL21nO1xudmFyIEZVTkNUSU9OX0FSR1VNRU5UX05BTUVTID0gLyhbXlxccyxdKykvZztcblxuVXRpbHMucHJvdG90eXBlLml0ZXJhdGVPYmplY3QgPSBmdW5jdGlvbihvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICBjYWxsYmFjayhrZXksIHZhbHVlKTtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24oYXJyYXksIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpPGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBpdGVtID0gYXJyYXlbaV07XG4gICAgICAgIHZhciBtYXBwZWRJdGVtID0gY2FsbGJhY2soaXRlbSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKG1hcHBlZEl0ZW0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuVXRpbHMucHJvdG90eXBlLmdldEZ1bmN0aW9uUGFyYW1ldGVycyA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgZm5TdHIgPSBmdW5jLnRvU3RyaW5nKCkucmVwbGFjZShGVU5DVElPTl9TVFJJUF9DT01NRU5UUywgJycpO1xuICAgIHZhciByZXN1bHQgPSBmblN0ci5zbGljZShmblN0ci5pbmRleE9mKCcoJykrMSwgZm5TdHIuaW5kZXhPZignKScpKS5tYXRjaChGVU5DVElPTl9BUkdVTUVOVF9OQU1FUyk7XG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUudG9TdHJpbmdzID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoYXJyYXksIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQgfHwgaXRlbSA9PT0gbnVsbCB8fCAhaXRlbS50b1N0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gaXRlbS50b1N0cmluZygpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKlxuVXRpbHMucHJvdG90eXBlLm9iamVjdFZhbHVlc1RvQXJyYXkgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpPGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgICAgICByZXN1bHQucHVzaCh2YWx1ZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuKi9cblxuVXRpbHMucHJvdG90eXBlLml0ZXJhdGVBcnJheSA9IGZ1bmN0aW9uKGFycmF5LCBjYWxsYmFjaykge1xuICAgIGZvciAodmFyIGluZGV4ID0gMDsgaW5kZXg8YXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGFycmF5W2luZGV4XTtcbiAgICAgICAgY2FsbGJhY2sodmFsdWUsIGluZGV4KTtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbihleHByZXNzaW9uU2VydmljZSwgZGF0YSwgY29sRGVmLCBub2RlLCBhcGksIGNvbnRleHQpIHtcblxuICAgIHZhciB2YWx1ZUdldHRlciA9IGNvbERlZi52YWx1ZUdldHRlcjtcbiAgICB2YXIgZmllbGQgPSBjb2xEZWYuZmllbGQ7XG5cbiAgICAvLyBpZiB0aGVyZSBpcyBhIHZhbHVlIGdldHRlciwgdGhpcyBnZXRzIHByZWNlZGVuY2Ugb3ZlciBhIGZpZWxkXG4gICAgaWYgKHZhbHVlR2V0dGVyKSB7XG5cbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICAgICAgY29sRGVmOiBjb2xEZWYsXG4gICAgICAgICAgICBhcGk6IGFwaSxcbiAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlR2V0dGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyB2YWx1ZUdldHRlciBpcyBhIGZ1bmN0aW9uLCBzbyBqdXN0IGNhbGwgaXRcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZUdldHRlcihwYXJhbXMpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZUdldHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIHZhbHVlR2V0dGVyIGlzIGFuIGV4cHJlc3Npb24sIHNvIGV4ZWN1dGUgdGhlIGV4cHJlc3Npb25cbiAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uU2VydmljZS5ldmFsdWF0ZSh2YWx1ZUdldHRlciwgcGFyYW1zKTtcbiAgICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChmaWVsZCAmJiBkYXRhKSB7XG4gICAgICAgIHJldHVybiBkYXRhW2ZpZWxkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn07XG5cbi8vUmV0dXJucyB0cnVlIGlmIGl0IGlzIGEgRE9NIG5vZGVcbi8vdGFrZW4gZnJvbTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zODQyODYvamF2YXNjcmlwdC1pc2RvbS1ob3ctZG8teW91LWNoZWNrLWlmLWEtamF2YXNjcmlwdC1vYmplY3QtaXMtYS1kb20tb2JqZWN0XG5VdGlscy5wcm90b3R5cGUuaXNOb2RlID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiAoXG4gICAgICAgIHR5cGVvZiBOb2RlID09PSBcIm9iamVjdFwiID8gbyBpbnN0YW5jZW9mIE5vZGUgOlxuICAgICAgICBvICYmIHR5cGVvZiBvID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBvLm5vZGVUeXBlID09PSBcIm51bWJlclwiICYmIHR5cGVvZiBvLm5vZGVOYW1lID09PSBcInN0cmluZ1wiXG4gICAgKTtcbn07XG5cbi8vUmV0dXJucyB0cnVlIGlmIGl0IGlzIGEgRE9NIGVsZW1lbnRcbi8vdGFrZW4gZnJvbTogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zODQyODYvamF2YXNjcmlwdC1pc2RvbS1ob3ctZG8teW91LWNoZWNrLWlmLWEtamF2YXNjcmlwdC1vYmplY3QtaXMtYS1kb20tb2JqZWN0XG5VdGlscy5wcm90b3R5cGUuaXNFbGVtZW50ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiAoXG4gICAgICAgIHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gXCJvYmplY3RcIiA/IG8gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCA6IC8vRE9NMlxuICAgICAgICBvICYmIHR5cGVvZiBvID09PSBcIm9iamVjdFwiICYmIG8gIT09IG51bGwgJiYgby5ub2RlVHlwZSA9PT0gMSAmJiB0eXBlb2Ygby5ub2RlTmFtZSA9PT0gXCJzdHJpbmdcIlxuICAgICk7XG59O1xuXG5VdGlscy5wcm90b3R5cGUuaXNOb2RlT3JFbGVtZW50ID0gZnVuY3Rpb24obykge1xuICAgIHJldHVybiB0aGlzLmlzTm9kZShvKSB8fCB0aGlzLmlzRWxlbWVudChvKTtcbn07XG5cbi8vYWRkcyBhbGwgdHlwZSBvZiBjaGFuZ2UgbGlzdGVuZXJzIHRvIGFuIGVsZW1lbnQsIGludGVuZGVkIHRvIGJlIGEgdGV4dCBmaWVsZFxuVXRpbHMucHJvdG90eXBlLmFkZENoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgbGlzdGVuZXIpIHtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VkXCIsIGxpc3RlbmVyKTtcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJwYXN0ZVwiLCBsaXN0ZW5lcik7XG4gICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgbGlzdGVuZXIpO1xufTtcblxuLy9pZiB2YWx1ZSBpcyB1bmRlZmluZWQsIG51bGwgb3IgYmxhbmssIHJldHVybnMgbnVsbCwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIHZhbHVlXG5VdGlscy5wcm90b3R5cGUubWFrZU51bGwgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUucmVtb3ZlQWxsQ2hpbGRyZW4gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYgKG5vZGUpIHtcbiAgICAgICAgd2hpbGUgKG5vZGUuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgICAgICBub2RlLnJlbW92ZUNoaWxkKG5vZGUubGFzdENoaWxkKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vYWRkcyBhbiBlbGVtZW50IHRvIGEgZGl2LCBidXQgYWxzbyBhZGRzIGEgYmFja2dyb3VuZCBjaGVja2luZyBmb3IgY2xpY2tzLFxuLy9zbyB0aGF0IHdoZW4gdGhlIGJhY2tncm91bmQgaXMgY2xpY2tlZCwgdGhlIGNoaWxkIGlzIHJlbW92ZWQgYWdhaW4sIGdpdmluZ1xuLy9hIG1vZGVsIGxvb2sgdG8gcG9wdXBzLlxuVXRpbHMucHJvdG90eXBlLmFkZEFzTW9kYWxQb3B1cCA9IGZ1bmN0aW9uKGVQYXJlbnQsIGVDaGlsZCkge1xuICAgIHZhciBlQmFja2Ryb3AgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGVCYWNrZHJvcC5jbGFzc05hbWUgPSBcImFnLXBvcHVwLWJhY2tkcm9wXCI7XG5cbiAgICBlQmFja2Ryb3Aub25jbGljayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBlUGFyZW50LnJlbW92ZUNoaWxkKGVDaGlsZCk7XG4gICAgICAgIGVQYXJlbnQucmVtb3ZlQ2hpbGQoZUJhY2tkcm9wKTtcbiAgICB9O1xuXG4gICAgZVBhcmVudC5hcHBlbmRDaGlsZChlQmFja2Ryb3ApO1xuICAgIGVQYXJlbnQuYXBwZW5kQ2hpbGQoZUNoaWxkKTtcbn07XG5cbi8vbG9hZHMgdGhlIHRlbXBsYXRlIGFuZCByZXR1cm5zIGl0IGFzIGFuIGVsZW1lbnQuIG1ha2VzIHVwIGZvciBubyBzaW1wbGUgd2F5IGluXG4vL3RoZSBkb20gYXBpIHRvIGxvYWQgaHRtbCBkaXJlY3RseSwgZWcgd2UgY2Fubm90IGRvIHRoaXM6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGVtcGxhdGUpXG5VdGlscy5wcm90b3R5cGUubG9hZFRlbXBsYXRlID0gZnVuY3Rpb24odGVtcGxhdGUpIHtcbiAgICB2YXIgdGVtcERpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgdGVtcERpdi5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbiAgICByZXR1cm4gdGVtcERpdi5maXJzdENoaWxkO1xufTtcblxuLy9pZiBwYXNzZWQgJzQycHgnIHRoZW4gcmV0dXJucyB0aGUgbnVtYmVyIDQyXG5VdGlscy5wcm90b3R5cGUucGl4ZWxTdHJpbmdUb051bWJlciA9IGZ1bmN0aW9uKHZhbCkge1xuICAgIGlmICh0eXBlb2YgdmFsID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGlmICh2YWwuaW5kZXhPZihcInB4XCIpID49IDApIHtcbiAgICAgICAgICAgIHZhbC5yZXBsYWNlKFwicHhcIiwgXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHZhbDtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUucXVlcnlTZWxlY3RvckFsbF9hZGRDc3NDbGFzcyA9IGZ1bmN0aW9uKGVQYXJlbnQsIHNlbGVjdG9yLCBjc3NDbGFzcykge1xuICAgIHZhciBlUm93cyA9IGVQYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBlUm93cy5sZW5ndGg7IGsrKykge1xuICAgICAgICB0aGlzLmFkZENzc0NsYXNzKGVSb3dzW2tdLCBjc3NDbGFzcyk7XG4gICAgfVxufTtcblxuVXRpbHMucHJvdG90eXBlLnF1ZXJ5U2VsZWN0b3JBbGxfcmVtb3ZlQ3NzQ2xhc3MgPSBmdW5jdGlvbihlUGFyZW50LCBzZWxlY3RvciwgY3NzQ2xhc3MpIHtcbiAgICB2YXIgZVJvd3MgPSBlUGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgZVJvd3MubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgdGhpcy5yZW1vdmVDc3NDbGFzcyhlUm93c1trXSwgY3NzQ2xhc3MpO1xuICAgIH1cbn07XG5cblV0aWxzLnByb3RvdHlwZS5xdWVyeVNlbGVjdG9yQWxsX3JlcGxhY2VDc3NDbGFzcyA9IGZ1bmN0aW9uKGVQYXJlbnQsIHNlbGVjdG9yLCBjc3NDbGFzc1RvUmVtb3ZlLCBjc3NDbGFzc1RvQWRkKSB7XG4gICAgdmFyIGVSb3dzID0gZVBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGVSb3dzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQ3NzQ2xhc3MoZVJvd3Nba10sIGNzc0NsYXNzVG9SZW1vdmUpO1xuICAgICAgICB0aGlzLmFkZENzc0NsYXNzKGVSb3dzW2tdLCBjc3NDbGFzc1RvQWRkKTtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUuYWRkT3JSZW1vdmVDc3NDbGFzcyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGNsYXNzTmFtZSwgYWRkT3JSZW1vdmUpIHtcbiAgICBpZiAoYWRkT3JSZW1vdmUpIHtcbiAgICAgICAgdGhpcy5hZGRDc3NDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQ3NzQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKTtcbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUuYWRkQ3NzQ2xhc3MgPSBmdW5jdGlvbihlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBpZiAoZWxlbWVudC5jbGFzc05hbWUgJiYgZWxlbWVudC5jbGFzc05hbWUubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgY3NzQ2xhc3NlcyA9IGVsZW1lbnQuY2xhc3NOYW1lLnNwbGl0KCcgJyk7XG4gICAgICAgIGlmIChjc3NDbGFzc2VzLmluZGV4T2YoY2xhc3NOYW1lKSA8IDApIHtcbiAgICAgICAgICAgIGNzc0NsYXNzZXMucHVzaChjbGFzc05hbWUpO1xuICAgICAgICAgICAgZWxlbWVudC5jbGFzc05hbWUgPSBjc3NDbGFzc2VzLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnQuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuICAgIH1cbn07XG5cblV0aWxzLnByb3RvdHlwZS5vZmZzZXRIZWlnaHQgPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQgJiYgZWxlbWVudC5jbGllbnRIZWlnaHQgPyBlbGVtZW50LmNsaWVudEhlaWdodCA6IDA7XG59O1xuXG5VdGlscy5wcm90b3R5cGUub2Zmc2V0V2lkdGggPSBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQgJiYgZWxlbWVudC5jbGllbnRXaWR0aCA/IGVsZW1lbnQuY2xpZW50V2lkdGggOiAwO1xufTtcblxuVXRpbHMucHJvdG90eXBlLnJlbW92ZUNzc0NsYXNzID0gZnVuY3Rpb24oZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgaWYgKGVsZW1lbnQuY2xhc3NOYW1lICYmIGVsZW1lbnQuY2xhc3NOYW1lLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGNzc0NsYXNzZXMgPSBlbGVtZW50LmNsYXNzTmFtZS5zcGxpdCgnICcpO1xuICAgICAgICB2YXIgaW5kZXggPSBjc3NDbGFzc2VzLmluZGV4T2YoY2xhc3NOYW1lKTtcbiAgICAgICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgICAgICAgIGNzc0NsYXNzZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIGVsZW1lbnQuY2xhc3NOYW1lID0gY3NzQ2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5VdGlscy5wcm90b3R5cGUucmVtb3ZlRnJvbUFycmF5ID0gZnVuY3Rpb24oYXJyYXksIG9iamVjdCkge1xuICAgIGFycmF5LnNwbGljZShhcnJheS5pbmRleE9mKG9iamVjdCksIDEpO1xufTtcblxuVXRpbHMucHJvdG90eXBlLmRlZmF1bHRDb21wYXJhdG9yID0gZnVuY3Rpb24odmFsdWVBLCB2YWx1ZUIpIHtcbiAgICB2YXIgdmFsdWVBTWlzc2luZyA9IHZhbHVlQSA9PT0gbnVsbCB8fCB2YWx1ZUEgPT09IHVuZGVmaW5lZDtcbiAgICB2YXIgdmFsdWVCTWlzc2luZyA9IHZhbHVlQiA9PT0gbnVsbCB8fCB2YWx1ZUIgPT09IHVuZGVmaW5lZDtcbiAgICBpZiAodmFsdWVBTWlzc2luZyAmJiB2YWx1ZUJNaXNzaW5nKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAodmFsdWVBTWlzc2luZykge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGlmICh2YWx1ZUJNaXNzaW5nKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmICh2YWx1ZUEgPCB2YWx1ZUIpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH0gZWxzZSBpZiAodmFsdWVBID4gdmFsdWVCKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cblV0aWxzLnByb3RvdHlwZS5mb3JtYXRXaWR0aCA9IGZ1bmN0aW9uKHdpZHRoKSB7XG4gICAgaWYgKHR5cGVvZiB3aWR0aCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICByZXR1cm4gd2lkdGggKyBcInB4XCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdpZHRoO1xuICAgIH1cbn07XG5cbi8vIHRyaWVzIHRvIHVzZSB0aGUgcHJvdmlkZWQgcmVuZGVyZXIuIGlmIGEgcmVuZGVyZXIgZm91bmQsIHJldHVybnMgdHJ1ZS5cbi8vIGlmIG5vIHJlbmRlcmVyLCByZXR1cm5zIGZhbHNlLlxuVXRpbHMucHJvdG90eXBlLnVzZVJlbmRlcmVyID0gZnVuY3Rpb24oZVBhcmVudCwgZVJlbmRlcmVyLCBwYXJhbXMpIHtcbiAgICB2YXIgcmVzdWx0RnJvbVJlbmRlcmVyID0gZVJlbmRlcmVyKHBhcmFtcyk7XG4gICAgaWYgKHRoaXMuaXNOb2RlKHJlc3VsdEZyb21SZW5kZXJlcikgfHwgdGhpcy5pc0VsZW1lbnQocmVzdWx0RnJvbVJlbmRlcmVyKSkge1xuICAgICAgICAvL2EgZG9tIG5vZGUgb3IgZWxlbWVudCB3YXMgcmV0dXJuZWQsIHNvIGFkZCBjaGlsZFxuICAgICAgICBlUGFyZW50LmFwcGVuZENoaWxkKHJlc3VsdEZyb21SZW5kZXJlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy9vdGhlcndpc2UgYXNzdW1lIGl0IHdhcyBodG1sLCBzbyBqdXN0IGluc2VydFxuICAgICAgICB2YXIgZVRleHRTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICBlVGV4dFNwYW4uaW5uZXJIVE1MID0gcmVzdWx0RnJvbVJlbmRlcmVyO1xuICAgICAgICBlUGFyZW50LmFwcGVuZENoaWxkKGVUZXh0U3Bhbik7XG4gICAgfVxufTtcblxuLy8gaWYgaWNvbiBwcm92aWRlZCwgdXNlIHRoaXMgKGVpdGhlciBhIHN0cmluZywgb3IgYSBmdW5jdGlvbiBjYWxsYmFjaykuXG4vLyBpZiBub3QsIHRoZW4gdXNlIHRoZSBzZWNvbmQgcGFyYW1ldGVyLCB3aGljaCBpcyB0aGUgc3ZnRmFjdG9yeSBmdW5jdGlvblxuVXRpbHMucHJvdG90eXBlLmNyZWF0ZUljb24gPSBmdW5jdGlvbihpY29uTmFtZSwgZ3JpZE9wdGlvbnNXcmFwcGVyLCBjb2xEZWZXcmFwcGVyLCBzdmdGYWN0b3J5RnVuYykge1xuICAgIHZhciBlUmVzdWx0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIHZhciB1c2VyUHJvdmlkZWRJY29uO1xuICAgIC8vIGNoZWNrIGNvbCBmb3IgaWNvbiBmaXJzdFxuICAgIGlmIChjb2xEZWZXcmFwcGVyICYmIGNvbERlZldyYXBwZXIuY29sRGVmLmljb25zKSB7XG4gICAgICAgIHVzZXJQcm92aWRlZEljb24gPSBjb2xEZWZXcmFwcGVyLmNvbERlZi5pY29uc1tpY29uTmFtZV07XG4gICAgfVxuICAgIC8vIGl0IG5vdCBpbiBjb2wsIHRyeSBncmlkIG9wdGlvbnNcbiAgICBpZiAoIXVzZXJQcm92aWRlZEljb24gJiYgZ3JpZE9wdGlvbnNXcmFwcGVyLmdldEljb25zKCkpIHtcbiAgICAgICAgdXNlclByb3ZpZGVkSWNvbiA9IGdyaWRPcHRpb25zV3JhcHBlci5nZXRJY29ucygpW2ljb25OYW1lXTtcbiAgICB9XG4gICAgLy8gbm93IGlmIHVzZXIgcHJvdmlkZWQsIHVzZSBpdFxuICAgIGlmICh1c2VyUHJvdmlkZWRJY29uKSB7XG4gICAgICAgIHZhciByZW5kZXJlclJlc3VsdDtcbiAgICAgICAgaWYgKHR5cGVvZiB1c2VyUHJvdmlkZWRJY29uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICByZW5kZXJlclJlc3VsdCA9IHVzZXJQcm92aWRlZEljb24oKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdXNlclByb3ZpZGVkSWNvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyUmVzdWx0ID0gdXNlclByb3ZpZGVkSWNvbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93ICdpY29uIGZyb20gZ3JpZCBvcHRpb25zIG5lZWRzIHRvIGJlIGEgc3RyaW5nIG9yIGEgZnVuY3Rpb24nO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgcmVuZGVyZXJSZXN1bHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBlUmVzdWx0LmlubmVySFRNTCA9IHJlbmRlcmVyUmVzdWx0O1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaXNOb2RlT3JFbGVtZW50KHJlbmRlcmVyUmVzdWx0KSkge1xuICAgICAgICAgICAgZVJlc3VsdC5hcHBlbmRDaGlsZChyZW5kZXJlclJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyAnaWNvblJlbmRlcmVyIHNob3VsZCByZXR1cm4gYmFjayBhIHN0cmluZyBvciBhIGRvbSBvYmplY3QnO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHdlIHVzZSB0aGUgYnVpbHQgaW4gaWNvblxuICAgICAgICBlUmVzdWx0LmFwcGVuZENoaWxkKHN2Z0ZhY3RvcnlGdW5jKCkpO1xuICAgIH1cbiAgICByZXR1cm4gZVJlc3VsdDtcbn07XG5cblxuVXRpbHMucHJvdG90eXBlLmdldFNjcm9sbGJhcldpZHRoID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBvdXRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgb3V0ZXIuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG4gICAgb3V0ZXIuc3R5bGUud2lkdGggPSBcIjEwMHB4XCI7XG4gICAgb3V0ZXIuc3R5bGUubXNPdmVyZmxvd1N0eWxlID0gXCJzY3JvbGxiYXJcIjsgLy8gbmVlZGVkIGZvciBXaW5KUyBhcHBzXG5cbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG91dGVyKTtcblxuICAgIHZhciB3aWR0aE5vU2Nyb2xsID0gb3V0ZXIub2Zmc2V0V2lkdGg7XG4gICAgLy8gZm9yY2Ugc2Nyb2xsYmFyc1xuICAgIG91dGVyLnN0eWxlLm92ZXJmbG93ID0gXCJzY3JvbGxcIjtcblxuICAgIC8vIGFkZCBpbm5lcmRpdlxuICAgIHZhciBpbm5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgaW5uZXIuc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcbiAgICBvdXRlci5hcHBlbmRDaGlsZChpbm5lcik7XG5cbiAgICB2YXIgd2lkdGhXaXRoU2Nyb2xsID0gaW5uZXIub2Zmc2V0V2lkdGg7XG5cbiAgICAvLyByZW1vdmUgZGl2c1xuICAgIG91dGVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQob3V0ZXIpO1xuXG4gICAgcmV0dXJuIHdpZHRoTm9TY3JvbGwgLSB3aWR0aFdpdGhTY3JvbGw7XG59O1xuXG5VdGlscy5wcm90b3R5cGUuaXNLZXlQcmVzc2VkID0gZnVuY3Rpb24oZXZlbnQsIGtleVRvQ2hlY2spIHtcbiAgICB2YXIgcHJlc3NlZEtleSA9IGV2ZW50LndoaWNoIHx8IGV2ZW50LmtleUNvZGU7XG4gICAgcmV0dXJuIHByZXNzZWRLZXkgPT09IGtleVRvQ2hlY2s7XG59O1xuXG5VdGlscy5wcm90b3R5cGUuc2V0VmlzaWJsZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZpc2libGUpIHtcbiAgICBpZiAodmlzaWJsZSkge1xuICAgICAgICBlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVXRpbHMoKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gXCI8ZGl2IGNsYXNzPWFnLWxpc3Qtc2VsZWN0aW9uPjxkaXY+PGRpdiBhZy1yZXBlYXQ+PC9kaXY+PC9kaXY+PC9kaXY+XCI7XG4iLCJ2YXIgdGVtcGxhdGUgPSByZXF1aXJlKCcuL2NoZWNrYm94U2VsZWN0aW9uLmh0bWwnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG52YXIgZHJhZ0FuZERyb3BTZXJ2aWNlID0gcmVxdWlyZSgnLi4vZHJhZ0FuZERyb3AvZHJhZ0FuZERyb3BTZXJ2aWNlJyk7XG5cbnZhciBOT1RfRFJPUF9UQVJHRVQgPSAwO1xudmFyIERST1BfVEFSR0VUX0FCT1ZFID0gMTtcbnZhciBEUk9QX1RBUkdFVF9CRUxPVyA9IC0xMTtcblxuZnVuY3Rpb24gQ2hlY2tib3hTZWxlY3Rpb24oKSB7XG4gICAgdGhpcy5zZXR1cENvbXBvbmVudHMoKTtcbiAgICB0aGlzLnVuaXF1ZUlkID0gJ0NoZWNrYm94U2VsZWN0aW9uLScgKyBNYXRoLnJhbmRvbSgpO1xuICAgIHRoaXMubW9kZWxDaGFuZ2VkTGlzdGVuZXJzID0gW107XG4gICAgdGhpcy5kcmFnU291cmNlcyA9IFtdO1xuICAgIHRoaXMuc2V0dXBBc0Ryb3BUYXJnZXQoKTtcbn1cblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLnNldEVtcHR5TWVzc2FnZSA9IGZ1bmN0aW9uKGVtcHR5TWVzc2FnZSkge1xuICAgIHJldHVybiB0aGlzLmVtcHR5TWVzc2FnZSA9IGVtcHR5TWVzc2FnZTtcbiAgICB0aGlzLnJlZnJlc2hWaWV3KCk7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZ2V0VW5pcXVlSWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy51bmlxdWVJZDtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5hZGREcmFnU291cmNlID0gZnVuY3Rpb24oZHJhZ1NvdXJjZSkge1xuICAgIHRoaXMuZHJhZ1NvdXJjZXMucHVzaChkcmFnU291cmNlKTtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5hZGRNb2RlbENoYW5nZWRMaXN0ZW5lciA9IGZ1bmN0aW9uKGxpc3RlbmVyKSB7XG4gICAgdGhpcy5tb2RlbENoYW5nZWRMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZmlyZU1vZGVsQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpPHRoaXMubW9kZWxDaGFuZ2VkTGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMubW9kZWxDaGFuZ2VkTGlzdGVuZXJzW2ldKCk7XG4gICAgfVxufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLnNldHVwQ29tcG9uZW50cyA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy5lR3VpID0gdXRpbHMubG9hZFRlbXBsYXRlKHRlbXBsYXRlKTtcbiAgICB0aGlzLmVGaWx0ZXJWYWx1ZVRlbXBsYXRlID0gdGhpcy5lR3VpLnF1ZXJ5U2VsZWN0b3IoXCJbYWctcmVwZWF0XVwiKTtcblxuICAgIHRoaXMuZUxpc3RQYXJlbnQgPSB0aGlzLmVGaWx0ZXJWYWx1ZVRlbXBsYXRlLnBhcmVudE5vZGU7XG4gICAgdXRpbHMucmVtb3ZlQWxsQ2hpbGRyZW4odGhpcy5lTGlzdFBhcmVudCk7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuc2V0TW9kZWwgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLnJlZnJlc2hWaWV3KCk7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZ2V0TW9kZWwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5tb2RlbDtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5zZXRDZWxsUmVuZGVyZXIgPSBmdW5jdGlvbihjZWxsUmVuZGVyZXIpIHtcbiAgICB0aGlzLmNlbGxSZW5kZXJlciA9IGNlbGxSZW5kZXJlcjtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5yZWZyZXNoVmlldyA9IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLnJlbW92ZUFsbENoaWxkcmVuKHRoaXMuZUxpc3RQYXJlbnQpO1xuXG4gICAgaWYgKHRoaXMubW9kZWwgJiYgdGhpcy5tb2RlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0Um93cygpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0QmxhbmtNZXNzYWdlKCk7XG4gICAgfVxufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmluc2VydFJvd3MgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaTx0aGlzLm1vZGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBpdGVtID0gdGhpcy5tb2RlbFtpXTtcbiAgICAgICAgLy92YXIgdGV4dCA9IHRoaXMuZ2V0VGV4dChpdGVtKTtcbiAgICAgICAgLy92YXIgc2VsZWN0ZWQgPSB0aGlzLmlzU2VsZWN0ZWQoaXRlbSk7XG4gICAgICAgIHZhciBlTGlzdEl0ZW0gPSB0aGlzLmVGaWx0ZXJWYWx1ZVRlbXBsYXRlLmNsb25lTm9kZSh0cnVlKTtcblxuICAgICAgICBpZiAodGhpcy5jZWxsUmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7dmFsdWU6IGl0ZW19O1xuICAgICAgICAgICAgdXRpbHMudXNlUmVuZGVyZXIoZUxpc3RJdGVtLCB0aGlzLmNlbGxSZW5kZXJlciwgcGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVMaXN0SXRlbS5pbm5lckhUTUwgPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hZGREcmFnQW5kRHJvcFRvTGlzdEl0ZW0oZUxpc3RJdGVtLCBpdGVtKTtcbiAgICAgICAgdGhpcy5lTGlzdFBhcmVudC5hcHBlbmRDaGlsZChlTGlzdEl0ZW0pO1xuICAgIH1cbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnRCbGFua01lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5lbXB0eU1lc3NhZ2UpIHtcbiAgICAgICAgdmFyIGVNZXNzYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGVNZXNzYWdlLnN0eWxlLmNvbG9yID0gJ2dyZXknO1xuICAgICAgICBlTWVzc2FnZS5zdHlsZS5wYWRkaW5nID0gJzIwcHgnO1xuICAgICAgICBlTWVzc2FnZS5zdHlsZS50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgICAgICAgZU1lc3NhZ2UuaW5uZXJIVE1MID0gdGhpcy5lbXB0eU1lc3NhZ2U7XG4gICAgICAgIHRoaXMuZUxpc3RQYXJlbnQuYXBwZW5kQ2hpbGQoZU1lc3NhZ2UpO1xuICAgIH1cbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5nZXREcmFnSXRlbSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmRyYWdJdGVtO1xufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLnNldHVwQXNEcm9wVGFyZ2V0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICBkcmFnQW5kRHJvcFNlcnZpY2UuYWRkRHJvcFRhcmdldCh0aGlzLmVHdWksIHtcbiAgICAgICAgYWNjZXB0RHJhZzogdGhpcy5leHRlcm5hbEFjY2VwdERyYWcuYmluZCh0aGlzKSxcbiAgICAgICAgZHJvcDogdGhpcy5leHRlcm5hbERyb3AuYmluZCh0aGlzKSxcbiAgICAgICAgbm9Ecm9wOiB0aGlzLmV4dGVybmFsTm9Ecm9wLmJpbmQodGhpcylcbiAgICB9KTtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5leHRlcm5hbEFjY2VwdERyYWcgPSBmdW5jdGlvbihkcmFnRXZlbnQpIHtcbiAgICB2YXIgYWxsb3dlZFNvdXJjZSA9IHRoaXMuZHJhZ1NvdXJjZXMuaW5kZXhPZihkcmFnRXZlbnQuY29udGFpbmVySWQpID49IDA7XG4gICAgaWYgKCFhbGxvd2VkU291cmNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGFscmVhZHlIYXZlQ29sID0gdGhpcy5tb2RlbC5pbmRleE9mKGRyYWdFdmVudC5kYXRhKSA+PSAwO1xuICAgIGlmIChhbHJlYWR5SGF2ZUNvbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuZUd1aS5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnbGlnaHRncmVlbic7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZXh0ZXJuYWxEcm9wID0gZnVuY3Rpb24oZHJhZ0V2ZW50KSB7XG4gICAgdGhpcy5hZGRJdGVtVG9MaXN0KGRyYWdFdmVudC5kYXRhKTtcbiAgICB0aGlzLmVHdWkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuZXh0ZXJuYWxOb0Ryb3AgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVHdWkuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJyc7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuYWRkSXRlbVRvTGlzdCA9IGZ1bmN0aW9uKG5ld0l0ZW0pIHtcbiAgICB0aGlzLm1vZGVsLnB1c2gobmV3SXRlbSk7XG4gICAgdGhpcy5yZWZyZXNoVmlldygpO1xuICAgIHRoaXMuZmlyZU1vZGVsQ2hhbmdlZCgpO1xufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmFkZERyYWdBbmREcm9wVG9MaXN0SXRlbSA9IGZ1bmN0aW9uKGVMaXN0SXRlbSwgaXRlbSkge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICBkcmFnQW5kRHJvcFNlcnZpY2UuYWRkRHJhZ1NvdXJjZShlTGlzdEl0ZW0sIHtcbiAgICAgICAgZ2V0RGF0YTogZnVuY3Rpb24oKSB7IHJldHVybiBpdGVtOyB9LFxuICAgICAgICBnZXRDb250YWluZXJJZDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGF0LnVuaXF1ZUlkOyB9XG4gICAgfSk7XG4gICAgZHJhZ0FuZERyb3BTZXJ2aWNlLmFkZERyb3BUYXJnZXQoZUxpc3RJdGVtLCB7XG4gICAgICAgIGFjY2VwdERyYWc6IGZ1bmN0aW9uIChkcmFnSXRlbSkgeyByZXR1cm4gdGhhdC5pbnRlcm5hbEFjY2VwdERyYWcoaXRlbSwgZHJhZ0l0ZW0sIGVMaXN0SXRlbSk7IH0sXG4gICAgICAgIGRyb3A6IGZ1bmN0aW9uIChkcmFnSXRlbSkgeyB0aGF0LmludGVybmFsRHJvcChpdGVtLCBkcmFnSXRlbS5kYXRhKTsgfSxcbiAgICAgICAgbm9Ecm9wOiBmdW5jdGlvbiAoKSB7IHRoYXQuaW50ZXJuYWxOb0Ryb3AoZUxpc3RJdGVtKTsgfVxuICAgIH0pO1xufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmludGVybmFsQWNjZXB0RHJhZyA9IGZ1bmN0aW9uKHRhcmdldENvbHVtbiwgZHJhZ0l0ZW0sIGVMaXN0SXRlbSkge1xuICAgIHZhciByZXN1bHQgPSBkcmFnSXRlbS5kYXRhICE9PSB0YXJnZXRDb2x1bW4gJiYgZHJhZ0l0ZW0uY29udGFpbmVySWQgPT09IHRoaXMudW5pcXVlSWQ7XG4gICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBpZiAodGhpcy5kcmFnQWZ0ZXJUaGlzSXRlbSh0YXJnZXRDb2x1bW4sIGRyYWdJdGVtLmRhdGEpKSB7XG4gICAgICAgICAgICB0aGlzLnNldERyb3BDc3NDbGFzc2VzKGVMaXN0SXRlbSwgRFJPUF9UQVJHRVRfQUJPVkUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXREcm9wQ3NzQ2xhc3NlcyhlTGlzdEl0ZW0sIERST1BfVEFSR0VUX0JFTE9XKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmludGVybmFsRHJvcCA9IGZ1bmN0aW9uKHRhcmdldENvbHVtbiwgZHJhZ2dlZENvbHVtbikge1xuICAgIHZhciBvbGRJbmRleCA9IHRoaXMubW9kZWwuaW5kZXhPZihkcmFnZ2VkQ29sdW1uKTtcbiAgICB2YXIgbmV3SW5kZXggPSB0aGlzLm1vZGVsLmluZGV4T2YodGFyZ2V0Q29sdW1uKTtcblxuICAgIHRoaXMubW9kZWwuc3BsaWNlKG9sZEluZGV4LCAxKTtcbiAgICB0aGlzLm1vZGVsLnNwbGljZShuZXdJbmRleCwgMCwgZHJhZ2dlZENvbHVtbik7XG5cbiAgICB0aGlzLnJlZnJlc2hWaWV3KCk7XG4gICAgdGhpcy5maXJlTW9kZWxDaGFuZ2VkKCk7XG59O1xuXG5DaGVja2JveFNlbGVjdGlvbi5wcm90b3R5cGUuaW50ZXJuYWxOb0Ryb3AgPSBmdW5jdGlvbihlTGlzdEl0ZW0pIHtcbiAgICB0aGlzLnNldERyb3BDc3NDbGFzc2VzKGVMaXN0SXRlbSwgTk9UX0RST1BfVEFSR0VUKTtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5kcmFnQWZ0ZXJUaGlzSXRlbSA9IGZ1bmN0aW9uKHRhcmdldENvbHVtbiwgZHJhZ2dlZENvbHVtbikge1xuICAgIHJldHVybiB0aGlzLm1vZGVsLmluZGV4T2YodGFyZ2V0Q29sdW1uKSA8IHRoaXMubW9kZWwuaW5kZXhPZihkcmFnZ2VkQ29sdW1uKTtcbn07XG5cbkNoZWNrYm94U2VsZWN0aW9uLnByb3RvdHlwZS5zZXREcm9wQ3NzQ2xhc3NlcyA9IGZ1bmN0aW9uKGVMaXN0SXRlbSwgc3RhdGUpIHtcbiAgICB1dGlscy5hZGRPclJlbW92ZUNzc0NsYXNzKGVMaXN0SXRlbSwgJ2FnLW5vdC1kcm9wLXRhcmdldCcsIHN0YXRlID09PSBOT1RfRFJPUF9UQVJHRVQpO1xuICAgIHV0aWxzLmFkZE9yUmVtb3ZlQ3NzQ2xhc3MoZUxpc3RJdGVtLCAnYWctZHJvcC10YXJnZXQtYWJvdmUnLCBzdGF0ZSA9PT0gRFJPUF9UQVJHRVRfQUJPVkUpO1xuICAgIHV0aWxzLmFkZE9yUmVtb3ZlQ3NzQ2xhc3MoZUxpc3RJdGVtLCAnYWctZHJvcC10YXJnZXQtYmVsb3cnLCBzdGF0ZSA9PT0gRFJPUF9UQVJHRVRfQkVMT1cpO1xufTtcblxuQ2hlY2tib3hTZWxlY3Rpb24ucHJvdG90eXBlLmdldEd1aSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmVHdWk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoZWNrYm94U2VsZWN0aW9uO1xuIl19
