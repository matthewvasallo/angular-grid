/// <reference path="renderStatus.ts" />
/// <reference path="rowRenderer.ts" />

module ag.grid {

    export class AsyncRenderer {
        private inProgress = false;
        private addedRowIndexes : any[] = [];

        private rowRenderer: RowRenderer;
        private renderStatus: RenderStatus;
        private renderedRows: {[key: string]: RenderedRow};
        private gridOptionsWrapper: GridOptionsWrapper;
        private rowModel: any;
        private eventService: EventService;

        public constructor(gridOptionsWrapper: GridOptionsWrapper, rowRenderer: RowRenderer, renderStatus: RenderStatus,
                           eventService: EventService) {
            this.gridOptionsWrapper = gridOptionsWrapper;
            this.rowRenderer = rowRenderer;
            this.renderStatus = renderStatus;
            this.renderedRows = rowRenderer.getRenderedRows();
            this.eventService = eventService;
        }

        public setRowModel(rowModel: any) {
            this.rowModel = rowModel;
        }

        public startIfNeeded() {
            this.renderStatus.resetLevel();
            if (! this.inProgress) {
                this.inProgress = true;
                this.asyncRender();
            }
        }

        private asyncRender() {
            var that = this;
            var renderedSomething = false;
            var maxToRender = this.gridOptionsWrapper.getCellsToRenderPerPass();

            while (this.renderStatus.isLevelLessThanMax()) {
                var cellsRendered = this.checkRowRange(maxToRender);
                if (cellsRendered > 0) {
                    renderedSomething = true;
                    maxToRender -= cellsRendered;
                    if (maxToRender <= 0) {
                        break;
                    }
                }

                this.renderStatus.nextLevel();
                this.dispatchRowsAdded();
            }

            if (renderedSomething) {
                // do another iteration
                setTimeout(function() {
                    that.asyncRender();
                }, 0);
            } else {
                this.inProgress = false;
                // catch up with angular when we're done.
                this.rowRenderer.doAngularAppy();
            }
        }

        private checkRowRange(maxToRender: number) : number {
            var areaToRender = this.renderStatus.getAreaToRender();
            var cellsRendered = 0;
            var columnOffsets = this.renderStatus.getColumnOffsets();

            for (var rowIndex = areaToRender.top; maxToRender > 0 && rowIndex <= areaToRender.bottom; rowIndex++) {
                var addedHere : number;
                var thisRow = this.renderedRows[rowIndex];
                if (!thisRow) {
                    thisRow = this.rowRenderer.addRow(rowIndex);
                    this.addedRowIndexes.push(rowIndex);
                }
                addedHere = thisRow.drawPinnedAndColumnRange(areaToRender.left, areaToRender.right, maxToRender, columnOffsets);
                cellsRendered += addedHere;
                maxToRender -= addedHere;
            }

            return cellsRendered;
        }

        private dispatchRowsAdded() {
            if (this.addedRowIndexes.length > 0) {
                var that = this;
                var dataToDispatch : any[] = [];
                this.addedRowIndexes.forEach(function(rowIndex) {
                    if (that.renderedRows[rowIndex]) {
                        dataToDispatch.push(that.renderedRows[rowIndex].getData());
                    }
                });

                this.eventService.dispatchEvent(Events.EVENT_VIRTUAL_ROWS_ADDED, dataToDispatch);
                this.addedRowIndexes.length = 0;
            }
        }
    }
}
