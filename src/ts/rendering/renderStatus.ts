/// <reference path="renderedRow.ts" />
/// <reference path="../columnController.ts" />

module ag.grid {

    var DEFAULT_LEVELS = [{
        h: 0,
        v: 0
    }, {
        h: 5,
        v: 5
    }];

    export class RenderStatus {
        private currentLevel = 0;
        private levels = DEFAULT_LEVELS;
        private levelCount : number;

        private areaToRender : {top: number; left: number; bottom: number; right: number} = null;

        private maxVerticalBuffer: number;

        private gridOptionsWrapper: GridOptionsWrapper;
        private gridPanel: GridPanel;
        private rowRenderer: RowRenderer;
        private eBodyViewport: HTMLElement;
        private rowModel: any;
        private columnController: ColumnController;

        public constructor(gridOptionsWrapper: GridOptionsWrapper, gridPanel: GridPanel, rowRenderer: RowRenderer,
                           columnController: ColumnController, eBodyViewport: HTMLElement)
        {
            this.gridOptionsWrapper = gridOptionsWrapper;
            this.gridPanel = gridPanel;
            this.rowRenderer = rowRenderer;
            this.eBodyViewport = eBodyViewport;
            this.columnController = columnController;

            if (gridOptionsWrapper.getBufferLevels()) {
                this.levels = gridOptionsWrapper.getBufferLevels();
            }

            this.levelCount = this.levels.length;
            this.getMaxVerticalBuffer();
        }

        public setRowModel(rowModel: any) {
            this.rowModel = rowModel;
        }

        public getAreaToRender() : any {
            if (this.areaToRender === null) {
                this.computeAreaToRender();
            }
            return this.areaToRender;
        }

        public isLevelLessThanMax() : boolean {
            return this.currentLevel < this.levelCount;
        }

        public resetLevel() {
            this.currentLevel = 0;
            this.areaToRender = null;
        }

        private getMaxVerticalBuffer() {
            var max = 0;
            this.levels.forEach(function(level) {
                if (level.v > max) {
                    max = level.v;
                }
            });

            this.maxVerticalBuffer = max;
        }

        public nextLevel() {
            if (this.currentLevel < this.levelCount) {
                this.currentLevel++;
                this.areaToRender = null;
            }
        }

        private getFirstRowOnScreen() : number {
            var topPixel = this.eBodyViewport.scrollTop;
            return Math.floor(topPixel / this.gridOptionsWrapper.getRowHeight());
        }

        private getLastRowOnScreen() : number {
            var topPixel = this.eBodyViewport.scrollTop;
            var bottomPixel = topPixel + this.eBodyViewport.offsetHeight;
            return Math.floor(bottomPixel / this.gridOptionsWrapper.getRowHeight());
        }

        private computeAreaToRender() {
            var first: number;
            var last: number;
            var rowCount = this.rowModel.getVirtualRowCount();

            var level = this.currentLevel < this.levelCount ? this.currentLevel : this.levelCount - 1;
            var vBuffer = this.levels[level].v;
            if (vBuffer < 0 || this.gridOptionsWrapper.isForPrint()) {
                first = 0;
                last = rowCount - 1;
            } else {
                //add in buffer
                first = this.getFirstRowOnScreen() - vBuffer;
                last = this.getLastRowOnScreen() + vBuffer;

                // adjust, in case buffer extended actual size
                if (first < 0) {
                    first = 0;
                }
                if (last > rowCount - 1) {
                    last = rowCount - 1;
                }
            }

            if (this.areaToRender === null) {
                this.areaToRender = {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0
                };
            }

            this.areaToRender.top = first;
            this.areaToRender.bottom = last;

            var columns = this.columnController.getDisplayedColumns();
            var pinnedColCount = this.gridOptionsWrapper.getPinnedColCount();
            var viewportLeftPixel = this.eBodyViewport.scrollLeft;
            var viewportRightPixel = viewportLeftPixel + this.eBodyViewport.offsetWidth;

            var hBuffer = this.levels[level].h;
            if (hBuffer < 0) {
                first = 0;
                last = columns.length;
            } else {
                var firstColumnOnScreen = this.columnController.getColumnForOffset(viewportLeftPixel) - 1;
                var lastColumnOnScreen  =this.columnController.getColumnForOffset(viewportRightPixel) + 1;

                first = firstColumnOnScreen - hBuffer;
                last = lastColumnOnScreen + hBuffer;
            }

            if (first < 0) {
                first = 0;
            }
            if (last > columns.length) {
                last = columns.length;
            }

            this.areaToRender.left = first;
            this.areaToRender.right = last;
        }

        public getFirstRowToRetain() : number {
            return Math.max(0, this.getFirstRowOnScreen() - this.maxVerticalBuffer);
        }

        public getLastRowToRetain() : number {
            return Math.min(this.rowModel.getVirtualRowCount() - 1, this.getLastRowOnScreen() + this.maxVerticalBuffer);
        }
    }
}
