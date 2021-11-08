import { Component, Input, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartEvent } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Sale } from '../_model/nft';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html'
})
export class ChartComponent {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private _sales: Sale[];
  @Input() set sales(value: Sale[]) {
    this._sales = value;
    this.calcDataSets();
  }

  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: '',
        yAxisID: 'y-axis',
        xAxisID: 'x-axis',
        backgroundColor: 'transparent',
        borderColor: '#ff614d',
        pointBackgroundColor: '#ff614d',
        pointBorderColor: '#ff614d',
        pointHoverBackgroundColor: '#ff614d',
        pointHoverBorderColor: '#ff614d',
        pointRadius: 0
      }
    ],
    labels:  []
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    aspectRatio: 2,
    scales: {
      'x-axis': {
        position: 'bottom',
        ticks: {
          color: '#ff614d'
        }
      },
      'y-axis': {
        position: 'left',
        grid: {
          color: 'gray',
        },
        ticks: {
          color: '#ff614d'
        }
      }
    },
    plugins: {
      tooltip: {
        displayColors: false
      },
      legend: {
        display: false
      }
    }
  };

  public chartHovered({ event, active }: { event?: ChartEvent, active?: {}[] }): void {
    console.log(event, active);
  }

  
  private calcDataSets() {
    const data: number[] = [];
    const labels: string[] = [];

    this._sales.forEach((sale: Sale, index: number) => {
      data.push(sale.price);
      labels.push(index.toString());
    });

    this.lineChartData.datasets[0].data = data;
    this.lineChartData.labels = labels;

    this.chart?.update();
  }

}


