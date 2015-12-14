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

            while (this.renderStatus.isLevelLessThanMax()) {
                if (this.checkRowRange()) {
                    renderedSomething = true;
                    break;
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

        private checkRowRange() : boolean {
            var areaToRender = this.renderStatus.getAreaToRender();
            var renderedSomething = false;

            for (var rowIndex = areaToRender.top; rowIndex <= areaToRender.bottom; rowIndex++) {
                if (this.renderedRows[rowIndex]) {
                    // later will check for horizontal range
                    continue;
                }

                var addedRow = this.rowRenderer.addRow(rowIndex);
                // reset renderstatus.level when a row has been added?
                renderedSomething = true;
                this.addedRowIndexes.push(rowIndex);
                break;
            }

            return renderedSomething;
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
