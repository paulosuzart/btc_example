import "reflect-metadata";
import { Container, Service, Inject } from "typedi";
import { setInterval } from "timers";
import { RestClient, IRestResponse } from "typed-rest-client/RestClient";
const colors = require("colors/safe");

interface PriceService {
    current(): Promise<number>;
    market: string;
}

interface CEXLastPriceResponse {
    curr1: string;
    curr2: string;
    lprice: number;
}


@Service("cex.io")
class CexioPrice implements PriceService {
    private _lmarket: string;
    private _rmarket: string;
    client: RestClient;

    constructor() {
        console.log(colors.green("Creating Cex.io client"));
        this.client = new RestClient("mozilla");
    }

    set market (market: string) {
        [this._rmarket, this._lmarket] = market.split("-");
    }

    get market() {
        return `${this._rmarket}-${this._lmarket}`;
    }
    async current(): Promise<number> {
        if (!this._lmarket || !this._rmarket) {
            throw "please set market first";
        }
        const response = await this.client.get<CEXLastPriceResponse>(`https://cex.io/api/last_price/${this._rmarket}/${this._lmarket}`);
        if (response.statusCode != 200) {
            console.log(response.result);
            console.log(`/last_price/${this._rmarket}/${this._lmarket}`);
            return 0;
        }
        return response.result.lprice;
    }
}

@Service("bittrex")
class BittrexPrice implements PriceService {
    constructor() {
        console.log(colors.rainbow("Creating Bittrex client"));
    }

    set market(mkt: string) {
        console.log("setting market");
    }
    current(): Promise<number> {
        return Promise.resolve(23.99);
    }
}

const appFactory = () => {
  if (process.argv.length < 3) {
      return new App("BTC-USD");
  }
  return new App(process.argv[2]);
};

@Service({factory: appFactory})
class App {

    @Inject(process.env.EXCHANGE || "cex.io")
    priceService: PriceService;

    market: string;

    lastPrice: number;

    constructor(market: string) {
        this.market = market;
    }

    watch() {
        // This could be set via factory. But this example shows set/get
        this.priceService.market = this.market;
        this.query();
        setInterval(async () => {
            await this.query();
        }, 10000);
    }

    private async query() {
        const value = await this.priceService.current();
        if (value > this.lastPrice) {
            console.log(colors.green(`Current price for ${this.priceService.market} is: ${value}`));
        } else {
            console.log(colors.red(`Current price for ${this.priceService.market} is: ${value}`));
        }
    }
}


const app = Container.get(App);
app.watch();
