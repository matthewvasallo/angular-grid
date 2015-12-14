/// <reference path="renderedRow.ts" />

module ag.grid {

    //interface levelSpecification {
    //    h: number;
    //    v: number;
    //}
    var DEFAULT_LEVELS = [{
        h: 0,
        v: 0
    }, {
        h: 5,
        v: 5
    //}, {
    //    h: -1,
    //    v: 0
    }];

    export class RenderStatus {
        private currentLevel = 0;
        private levels = DEFAULT_LEVELS;
        private levelCount : number;

        private areaToRender : {top: number; left: number; bottom: number; right: number} = null;
        private columnOffsets : number[];

        private gridOptionsWrapper: GridOptionsWrapper;
        private gridPanel: GridPanel;
        private rowRenderer: RowRenderer;
        private eBodyViewport: HTMLElement;
        private rowModel: any;
        private columnModel: any;

        public constructor(gridOptionsWrapper: GridOptionsWrapper, gridPanel: GridPanel, rowRenderer: RowRenderer,
                    columnModel: any, eBodyViewport: HTMLElement)
        {
            this.gridOptionsWrapper = gridOptionsWrapper;
            this.gridPanel = gridPanel;
            this.rowRenderer = rowRenderer;
            this.eBodyViewport = eBodyViewport;
            this.columnModel = columnModel;

            this.levelCount = this.levels.length;
        }

        public setRowModel(rowModel: any) {
            this.rowModel = rowModel;
        }

        public getAreaToRender() : any {
            if (this.areaToRender === null) {
                this.areaToRender = {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0
                };
                this.computeAreaToRender();
            }
            return this.areaToRender;
        }

        public getColumnOffsets() {
            return this.columnOffsets;
        }

        public isLevelLessThanMax() : boolean {
            return this.currentLevel < this.levelCount;
        }

        public resetLevel() {
            this.currentLevel = 0;
            this.areaToRender = null;
        }

        public nextLevel() {
            if (this.currentLevel < this.levelCount) {
                this.currentLevel++;
            }
        }

        private computeAreaToRender() {
            var first: number;
            var last: number;
            var rowCount = this.rowModel.getVirtualRowCount();

            var vBuffer = this.levels[this.currentLevel].v;
            if (vBuffer < 0 || this.gridOptionsWrapper.isForPrint()) {
                first = 0;
                last = rowCount - 1;
            } else {
                var topPixel = this.eBodyViewport.scrollTop;
                var bottomPixel = topPixel + this.eBodyViewport.offsetHeight;

                first = Math.floor(topPixel / this.gridOptionsWrapper.getRowHeight());
                last = Math.floor(bottomPixel / this.gridOptionsWrapper.getRowHeight());

                //add in buffer
                first = first - vBuffer;
                last = last + vBuffer;

                // adjust, in case buffer extended actual size
                if (first < 0) {
                    first = 0;
                }
                if (last > rowCount - 1) {
                    last = rowCount - 1;
                }
            }

            this.areaToRender.top = first;
            this.areaToRender.bottom = last;

            var columns = this.columnModel.getDisplayedColumns();
            var pinnedColCount = this.gridOptionsWrapper.getPinnedColCount();
            var viewportLeftPixel = this.eBodyViewport.scrollLeft;
            var viewportRightPixel = viewportLeftPixel + this.eBodyViewport.offsetWidth;
            var columnOffsets : number[] = [];

            var hBuffer = this.levels[this.currentLevel].h;
            if (hBuffer < 0) {
                first = 0;
                last = columns.length;
            } else {
                var firstColumnOnScreen = 0;
                var lastColumnOnScreen  = columns.length;
                var hPos = 0;

                for (var i = pinnedColCount; i < columns.length; i++) {
                    columnOffsets[i] = hPos;
                    hPos += columns[i].actualWidth;
                    if (hPos >= viewportLeftPixel) {
                        firstColumnOnScreen = i;
                        break;
                    }
                }

                for (i++ ; i < columns.length; i++) {
                    columnOffsets[i] = hPos;
                    hPos += columns[i].actualWidth;
                    if (hPos >= viewportRightPixel) {
                        lastColumnOnScreen = i;
                        break;
                    }
                }

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
            this.columnOffsets = columnOffsets;
        }
    }
}
