/// <reference path="../utils.ts" />
/// <reference path="../constants.ts" />
/// <reference path="renderedRow.ts" />
/// <reference path="renderStatus.ts" />
/// <reference path="asyncRenderer.ts" />
/// <reference path="../cellRenderers/groupCellRendererFactory.ts" />

module ag.grid {

    var _ = Utils;

    export class RowRenderer {

        private columnModel: ColumnController;
        private gridOptionsWrapper: GridOptionsWrapper;
        private angularGrid: Grid;
        private selectionRendererFactory: SelectionRendererFactory;
        private gridPanel: GridPanel;
        private $compile: any;
        private $scope: any;
        private selectionController: SelectionController;
        private expressionService: ExpressionService;
        private templateService: TemplateService;
        private cellRendererMap: {[key: string]: any};
        private rowModel: any;
        private firstVirtualRenderedRow: number;
        private lastVirtualRenderedRow: number;
        private focusedCell: any;
        private valueService: ValueService;
        private eventService: EventService;

        private renderedRows: {[key: string]: RenderedRow};
        private renderedTopFloatingRows: RenderedRow[] = [];
        private renderedBottomFloatingRows: RenderedRow[] = [];

        private renderStatus: RenderStatus;
        private asyncRenderer: AsyncRenderer;

        private eAllBodyContainers: HTMLElement[];
        private eAllPinnedContainers: HTMLElement[];

        private eBodyContainer: HTMLElement;
        private eBodyViewport: HTMLElement;
        private ePinnedColsContainer: HTMLElement;
        private eFloatingTopContainer: HTMLElement;
        private eFloatingTopPinnedContainer: HTMLElement;
        private eFloatingBottomContainer: HTMLElement;
        private eFloatingBottomPinnedContainer: HTMLElement;
        private eParentsOfRows: HTMLElement[];
        private widthHolderDiv: HTMLElement;
        private cellToBeEdited: any;
        private editInProgress: boolean;

        public init(columnModel: ColumnController, gridOptionsWrapper: GridOptionsWrapper, gridPanel: GridPanel,
                    angularGrid: Grid, selectionRendererFactory: SelectionRendererFactory, $compile: any, $scope: any,
                    selectionController: SelectionController, expressionService: ExpressionService,
                    templateService: TemplateService, valueService: ValueService, eventService: EventService) {
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
            this.valueService = valueService;
            this.findAllElements(gridPanel);
            this.eventService = eventService;

            this.cellRendererMap = {
                'group': groupCellRendererFactory(gridOptionsWrapper, selectionRendererFactory, expressionService),
                'default': function(params: any) {
                    return params.value;
                }
            };

            // map of row ids to row objects. keeps track of which elements
            // are rendered for which rows in the dom.
            this.renderedRows = {};

            // Cengage addition
            this.renderStatus = new RenderStatus(gridOptionsWrapper, gridPanel, this, columnModel, this.eBodyViewport);
            this.asyncRenderer = new AsyncRenderer(gridOptionsWrapper, this, this.renderStatus, eventService);
        }

        public setRowModel(rowModel: any) {
            this.rowModel = rowModel;
            this.renderStatus.setRowModel(rowModel);
        }

        public onIndividualColumnResized(column: Column) {
            var newWidthPx = column.actualWidth + "px";
            var selectorForAllColsInCell = ".cell-col-" + column.index;
            this.eParentsOfRows.forEach( function(rowContainer: HTMLElement) {
                var cellsForThisCol: NodeList = rowContainer.querySelectorAll(selectorForAllColsInCell);
                for (var i = 0; i < cellsForThisCol.length; i++) {
                    var element = <HTMLElement> cellsForThisCol[i];
                    element.style.width = newWidthPx;
                }
            });
        }

        public setMainRowWidths() {
            var mainRowWidth = this.columnModel.getBodyContainerWidth() + "px";

            this.eAllBodyContainers.forEach( function(container: HTMLElement) {
                var unpinnedRows: [any] = (<any>container).querySelectorAll(".ag-row");
                for (var i = 0; i < unpinnedRows.length; i++) {
                    unpinnedRows[i].style.width = mainRowWidth;
                }
            });
        }

        private findAllElements(gridPanel: any) {
            this.eBodyContainer = gridPanel.getBodyContainer();
            this.ePinnedColsContainer = gridPanel.getPinnedColsContainer();

            this.eFloatingTopContainer = gridPanel.getFloatingTopContainer();
            this.eFloatingTopPinnedContainer = gridPanel.getPinnedFloatingTop();

            this.eFloatingBottomContainer = gridPanel.getFloatingBottomContainer();
            this.eFloatingBottomPinnedContainer = gridPanel.getPinnedFloatingBottom();

            this.eBodyViewport = gridPanel.getBodyViewport();
            this.eParentsOfRows = gridPanel.getRowsParent();

            this.eAllBodyContainers = [this.eBodyContainer, this.eFloatingBottomContainer,
                this.eFloatingTopContainer];
            this.eAllPinnedContainers = [this.ePinnedColsContainer, this.eFloatingBottomPinnedContainer,
                this.eFloatingTopPinnedContainer];

            this.addWidthHolderDiv();
        }

        // Cengage addition
        private addWidthHolderDiv(): any {
            // when all rows are deleted during scrolling, the container was collapsing to 0 width,
            // and losing the scroll position.
            // so we add an empty div off screen, with the desired width, and the position is preserved.
            var div = document.createElement("div");
            div.innerHTML = "&nbsp;";

            div.style.position = "absolute";
            div.style.top = "-100px";
            // width will be set dynamically
            this.eBodyContainer.appendChild(div);

            this.widthHolderDiv = div;
        }

        public refreshAllFloatingRows(): void {
            this.refreshFloatingRows(
                this.renderedTopFloatingRows,
                this.gridOptionsWrapper.getFloatingTopRowData(),
                this.eFloatingTopPinnedContainer,
                this.eFloatingTopContainer,
                true);
            this.refreshFloatingRows(
                this.renderedBottomFloatingRows,
                this.gridOptionsWrapper.getFloatingBottomRowData(),
                this.eFloatingBottomPinnedContainer,
                this.eFloatingBottomContainer,
                false);
        }

        private refreshFloatingRows(renderedRows: RenderedRow[], rowData: any[],
                                    pinnedContainer: HTMLElement, bodyContainer: HTMLElement,
                                    isTop: boolean): void {
            renderedRows.forEach( (row: RenderedRow) => {
                row.destroy();
            });

            renderedRows.length = 0;

            // if no cols, don't draw row - can we get rid of this???
            var columns = this.columnModel.getDisplayedColumns();
            if (!columns || columns.length == 0) {
                return;
            }

            // should we be storing this somewhere???
            var mainRowWidth = this.columnModel.getBodyContainerWidth();

            if (rowData) {
                rowData.forEach( (data: any, rowIndex: number) => {
                    var node: RowNode = {
                        data: data,
                        floating: true,
                        floatingTop: isTop,
                        floatingBottom: !isTop
                    };
                    var renderedRow = new RenderedRow(this.gridOptionsWrapper, this.valueService, this.$scope, this.angularGrid,
                        this.columnModel, this.expressionService, this.cellRendererMap, this.selectionRendererFactory,
                        this.$compile, this.templateService, this.selectionController, this,
                        bodyContainer, pinnedContainer, node, rowIndex, this.eventService);
                    renderedRow.setMainRowWidth(mainRowWidth);
                    renderedRows.push(renderedRow);
                })
            }
        }

        public refreshView(refreshFromIndex?: any) {
            if (!this.gridOptionsWrapper.isForPrint()) {
                var rowCount = this.rowModel.getVirtualRowCount();
                var containerHeight = this.gridOptionsWrapper.getRowHeight() * rowCount;
                this.eBodyContainer.style.height = containerHeight + "px";
                this.ePinnedColsContainer.style.height = containerHeight + "px";
            }

            this.refreshAllVirtualRows(refreshFromIndex);
            this.refreshAllFloatingRows();
        }

        public softRefreshView() {
            _.iterateObject(this.renderedRows, (key: any, renderedRow: RenderedRow)=> {
                renderedRow.softRefresh();
            });
        }

        public refreshRows(rowNodes: RowNode[]): void {
            if (!rowNodes || rowNodes.length==0) {
                return;
            }
            // we only need to be worried about rendered rows, as this method is
            // called to whats rendered. if the row isn't rendered, we don't care
            //var indexesToRemove: any = [];
            var redrawNeeded = false;
            _.iterateObject(this.renderedRows, (key: string, renderedRow: RenderedRow)=> {
                var rowNode = renderedRow.getRowNode();
                if (rowNodes.indexOf(rowNode)>=0) {
                    renderedRow.markForRefresh();
                    redrawNeeded = true;
                }
            });

            if (redrawNeeded) {
                this.asyncRenderer.startIfNeeded();
            }
        }

        public refreshCells(rowNodes: RowNode[], colIds: string[]): void {
            if (!rowNodes || rowNodes.length==0) {
                return;
            }
            // we only need to be worried about rendered rows, as this method is
            // called to whats rendered. if the row isn't rendered, we don't care
            _.iterateObject(this.renderedRows, (key: string, renderedRow: RenderedRow)=> {
                var rowNode = renderedRow.getRowNode();
                if (rowNodes.indexOf(rowNode)>=0) {
                    renderedRow.refreshCells(colIds);
                }
            });
        }

        public rowDataChanged(rows: any) {
            // we only need to be worried about rendered rows, as this method is
            // called to whats rendered. if the row isn't rendered, we don't care
            var indexesToRemove: any = [];
            var renderedRows = this.renderedRows;
            Object.keys(renderedRows).forEach(function (key: any) {
                var renderedRow = renderedRows[key];
                // see if the rendered row is in the list of rows we have to update
                if (renderedRow.isDataInList(rows)) {
                    indexesToRemove.push(key);
                }
            });
            // remove the rows
            this.removeVirtualRow(indexesToRemove);
            // add draw them again
            this.drawVirtualRows();
        }

        private refreshAllVirtualRows(fromIndex: any) {
            // make sure the dummy div spans the entire width, so that scroll position is maintained.
            this.widthHolderDiv.style.width = this.columnModel.getBodyContainerWidth() + "px";

            // remove all current virtual rows, as they have old data
            var rowsToRemove = Object.keys(this.renderedRows);
            this.removeVirtualRow(rowsToRemove, fromIndex);

            // add in new rows
            this.drawVirtualRows();
        }

        // public - removes the group rows and then redraws them again
        public refreshGroupRows() {
            // find all the group rows
            var rowsToRemove: any = [];
            var that = this;
            Object.keys(this.renderedRows).forEach(function (key: any) {
                var renderedRow = that.renderedRows[key];
                if (renderedRow.isGroup()) {
                    rowsToRemove.push(key);
                }
            });
            // remove the rows
            this.removeVirtualRow(rowsToRemove);
            // and draw them back again
            this.ensureRowsRendered();
        }

        // takes array of row indexes
        private removeVirtualRow(rowsToRemove: any, fromIndex?: any) {
            var that = this;
            // if no fromIndex then set to -1, which will refresh everything
            var realFromIndex = (typeof fromIndex === 'number') ? fromIndex : -1;
            rowsToRemove.forEach(function (indexToRemove: any) {
                if (indexToRemove >= realFromIndex) {
                    that.unbindVirtualRow(indexToRemove);

                    // if the row was last to have focus, we remove the fact that it has focus
                    if (that.focusedCell && that.focusedCell.rowIndex == indexToRemove) {
                        that.focusedCell = null;
                    }
                }
            });
        }

        private unbindVirtualRow(indexToRemove: any) {
            var renderedRow = this.renderedRows[indexToRemove];
            renderedRow.destroy();

            var event = {node: renderedRow.getRowNode(), rowIndex: indexToRemove};
            this.eventService.dispatchEvent(Events.EVENT_VIRTUAL_ROW_REMOVED, event);
            this.angularGrid.onVirtualRowRemoved(indexToRemove);

            delete this.renderedRows[indexToRemove];
        }

        public drawVirtualRows() {
            this.firstVirtualRenderedRow = this.renderStatus.getFirstRowToRetain();
            this.lastVirtualRenderedRow = this.renderStatus.getLastRowToRetain();

            this.ensureRowsRendered();
        }

        public getFirstVirtualRenderedRow() {
            return this.firstVirtualRenderedRow;
        }

        public getLastVirtualRenderedRow() {
            return this.lastVirtualRenderedRow;
        }

        private ensureRowsRendered() {

            //var start = new Date().getTime();

            var mainRowWidth = this.columnModel.getBodyContainerWidth();
            var that = this;
            var rowsNeeded = false;

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
                    rowsNeeded = true;
                }
            }

            // at this point, everything in our 'rowsToRemove' . . .
            this.removeVirtualRow(rowsToRemove);

            if (rowsNeeded) {
                // make sure async rendering is running
                this.asyncRenderer.startIfNeeded();
            }
            // if we are doing angular compiling, then do digest the scope here
            //if (this.gridOptionsWrapper.isAngularCompileRows()) {
                // we do it in a timeout, in case we are already in an apply
                //setTimeout(function () {
                //    that.$scope.$apply();
                //}, 0);
            //}

            //var end = new Date().getTime();
            //console.log(end-start);
        }

        private insertRow(node: any, rowIndex: any, mainRowWidth: any) {
            var columns = this.columnModel.getDisplayedColumns();
            // if no cols, don't draw row
            if (!columns || columns.length == 0) {
                return;
            }

            var renderedRow = new RenderedRow(this.gridOptionsWrapper, this.valueService, this.$scope, this.angularGrid,
                this.columnModel, this.expressionService, this.cellRendererMap, this.selectionRendererFactory,
                this.$compile, this.templateService, this.selectionController, this,
                this.eBodyContainer, this.ePinnedColsContainer, node, rowIndex, this.eventService);
            renderedRow.setMainRowWidth(mainRowWidth);

            this.renderedRows[rowIndex] = renderedRow;

            if (this.cellToBeEdited && this.cellToBeEdited.rowIndex === rowIndex) {
                renderedRow.noteColumnToEdit(this.cellToBeEdited.column);
                this.cellToBeEdited = null;
            }
        }

        // Cengage additions
        public addRow(rowIndex: number) : RenderedRow {
            var node = this.rowModel.getVirtualRow(rowIndex);
            this.insertRow(node, rowIndex, this.columnModel.getBodyContainerWidth());

            return this.renderedRows[rowIndex];
        }

        public getRenderedRows() : {[key: string]: RenderedRow} {
            return this.renderedRows;
        }

        public drawAfterScroll() {
            // remove any rows we don't want anymore
            this.drawVirtualRows();
            // if there was horizontal motion, make sure rendering is in progress to notice it.
            this.asyncRenderer.startIfNeeded();
        }

        public resetRenderRegion() {
            this.renderStatus.resetLevel();
        }

        public doAngularAppy() {
            if (this.gridOptionsWrapper.isAngularCompileRows()) {
                // we do it in a timeout, in case we are already in an apply
                var that = this;
                setTimeout(function () {
                    that.$scope.$apply();
                }, 0);
            }
        }

        public getRenderedNodes() {
            var renderedRows = this.renderedRows;
            return Object.keys(renderedRows).map(key => {
                return renderedRows[key].getRowNode();
            });
        }

        public getIndexOfRenderedNode(node: any): number {
            var renderedRows = this.renderedRows;
            var keys: string[] = Object.keys(renderedRows);
            for (var i = 0; i < keys.length; i++) {
                var key: string = keys[i];
                if (renderedRows[key].getRowNode() === node) {
                    return renderedRows[key].getRowIndex();
                }
            }
            return -1;
        }

        // we use index for rows, but column object for columns, as the next column (by index) might not
        // be visible (header grouping) so it's not reliable, so using the column object instead.
        public navigateToNextCell(key: any, rowIndex: number, column: Column) {

            var cellToFocus = {rowIndex: rowIndex, column: column};
            var renderedRow: RenderedRow;
            var eCell: any;

            // we keep searching for a next cell until we find one. this is how the group rows get skipped
            while (!eCell) {
                cellToFocus = this.getNextCellToFocus(key, cellToFocus);
                // no next cell means we have reached a grid boundary, eg left, right, top or bottom of grid
                if (!cellToFocus) {
                    return;
                }
                // see if the next cell is selectable, if yes, use it, if not, skip it
                renderedRow = this.renderedRows[cellToFocus.rowIndex];
                eCell = renderedRow.getCellForCol(cellToFocus.column);
            }

            // this scrolls the row into view
            this.gridPanel.ensureIndexVisible(renderedRow.getRowIndex());

            // this changes the css on the cell
            this.focusCell(eCell, cellToFocus.rowIndex, cellToFocus.column.index, cellToFocus.column.colDef, true);
        }

        private getNextCellToFocus(key: any, lastCellToFocus: any) {
            var lastRowIndex = lastCellToFocus.rowIndex;
            var lastColumn = lastCellToFocus.column;

            var nextRowToFocus: any;
            var nextColumnToFocus: any;
            switch (key) {
                case Constants.KEY_UP :
                    // if already on top row, do nothing
                    if (lastRowIndex === this.firstVirtualRenderedRow) {
                        return null;
                    }
                    nextRowToFocus = lastRowIndex - 1;
                    nextColumnToFocus = lastColumn;
                    break;
                case Constants.KEY_DOWN :
                    // if already on bottom, do nothing
                    if (lastRowIndex === this.lastVirtualRenderedRow) {
                        return null;
                    }
                    nextRowToFocus = lastRowIndex + 1;
                    nextColumnToFocus = lastColumn;
                    break;
                case Constants.KEY_RIGHT :
                    var colToRight = this.columnModel.getVisibleColAfter(lastColumn);
                    // if already on right, do nothing
                    if (!colToRight) {
                        return null;
                    }
                    nextRowToFocus = lastRowIndex;
                    nextColumnToFocus = colToRight;
                    break;
                case Constants.KEY_LEFT :
                    var colToLeft = this.columnModel.getVisibleColBefore(lastColumn);
                    // if already on left, do nothing
                    if (!colToLeft) {
                        return null;
                    }
                    nextRowToFocus = lastRowIndex;
                    nextColumnToFocus = colToLeft;
                    break;
            }

            return {
                rowIndex: nextRowToFocus,
                column: nextColumnToFocus
            };
        }

        public onRowSelected(rowIndex: number, selected: boolean) {
            if (this.renderedRows[rowIndex]) {
                this.renderedRows[rowIndex].onRowSelected(selected);
            }
        }

        // called by the renderedRow
        public focusCell(eCell: any, rowIndex: number, colIndex: number, colDef: ColDef, forceBrowserFocus: any) {
            // do nothing if cell selection is off
            if (this.gridOptionsWrapper.isSuppressCellSelection()) {
                return;
            }

            this.eParentsOfRows.forEach( function(rowContainer: HTMLElement) {
                // remove any previous focus
                _.querySelectorAll_replaceCssClass(rowContainer, '.ag-cell-focus', 'ag-cell-focus', 'ag-cell-no-focus');

                var selectorForCell = '[row="' + rowIndex + '"] [col="' + colIndex + '"]';
                _.querySelectorAll_replaceCssClass(rowContainer, selectorForCell, 'ag-cell-no-focus', 'ag-cell-focus');
            });

            this.focusedCell = {rowIndex: rowIndex, colIndex: colIndex, node: this.rowModel.getVirtualRow(rowIndex), colDef: colDef};

            // this puts the browser focus on the cell (so it gets key presses)
            if (forceBrowserFocus) {
                eCell.focus();
            }

            this.eventService.dispatchEvent(Events.EVENT_CELL_FOCUSED, this.focusedCell);
        }

        // for API
        public getFocusedCell() {
            return this.focusedCell;
        }

        // called via API
        public setFocusedCell(rowIndex: any, colIndex: any) {
            var renderedRow = this.renderedRows[rowIndex];
            var column = this.columnModel.getDisplayedColumns()[colIndex];
            if (renderedRow && column) {
                var eCell = renderedRow.getCellForCol(column);
                this.focusCell(eCell, rowIndex, colIndex, column.colDef, true);
            }
        }

        // Cengage addition
        public editCellAtRowColumn(rowIndex: any, colIndex: any): boolean {
            var renderedCell: RenderedCell = this.getCellAtRowColumn(rowIndex, colIndex);
            if (renderedCell && renderedCell.isCellEditable()) {
                renderedCell.startEditing();
                return true;
            }

            return false;
        }

        private getCellAtRowColumn(rowIndex: any, colIndex: any, display: boolean = false) : RenderedCell {
            var renderedRow: RenderedRow = this.renderedRows[rowIndex];
            var columns : Column[] = display ? this.columnModel.getDisplayedColumns() : this.columnModel.getAllColumns();
            var column : Column = columns[colIndex];
            if (renderedRow && column) {
                return renderedRow.getRenderedCellForColumn(column);
            }

            return null;
        }

        public getGridPanel() : GridPanel {
            return this.gridPanel;
        }

        public selectNextEditCellByParameters(rowIndex: any, column: any, params: any) {
            var visibleColumns = this.columnModel.getDisplayedColumns();
            var currentCol = column;
            var currentColIndex = visibleColumns.indexOf(currentCol);

            var dx = params.deltaX;
            var dy = params.deltaY;

            var position : {[key: string] : any} = {
                x: {
                    current: currentColIndex,
                    min: 0,
                    max: visibleColumns.length - 1
                },
                y: {
                    current: rowIndex,
                    min: 0,
                    max: this.rowModel.getVirtualRowCount() - 1
                }
            };

            var done = false;
            while (!done) {

                adjustPosition("x", dx);
                adjustPosition("y", dy);

                currentCol = visibleColumns[position['x'].current];

                if (params.skipPinned && currentCol.pinned) {
                    continue;
                }

                var renderedCell: RenderedCell = this.getCellAtRowColumn(position['y'].current, position['x'].current, true);
                if (renderedCell) {
                    //this.editCellAtRowColumn(position['y'].current, position['x'].current);
                    renderedCell.startEditing();
                    // ensure column visible: here or in startEditing?
                    done = true;
                } else {
                    // note position to edit when rendered
                    this.cellToBeEdited = {
                        rowIndex: position['y'].current,
                        column: currentCol
                    };
                    this.gridPanel.ensureIndexVisible(position['y'].current);
                    // also ensure horizontal visible?
                    done = true;
                }
            }

            function adjustPosition(which: string, delta: any, advanceOK = true) {
                if (! delta) {
                    return;
                }

                var coordinate : any = position[which];
                var other : string = which === "x" ? "y" : "x";
                var advanceAtEnd : boolean = advanceOK && params.advanceAtEnd && (<any>position[other].max) > (<any>position[other].min);

                coordinate.current += delta;
                if (coordinate.current < coordinate.min) {
                    coordinate.current = coordinate.max;
                    if (advanceAtEnd) {
                        adjustPosition(other, -1, false);
                    }
                } else if (coordinate.current > coordinate.max) {
                    coordinate.current = coordinate.min;
                    if (advanceAtEnd) {
                        adjustPosition(other, 1, false);
                    }
                }
            }
        }

        public isEditInProgress() : boolean {
            return this.editInProgress;
        }

        public setEditInProgress(newValue: boolean) {
            this.editInProgress = newValue;
        }
    }
}
