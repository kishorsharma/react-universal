import React from "react";
import { Provider } from "redux/react";
import { Router } from "react-router";
import Location from "react-router/lib/Location";
import store from "../store";
import HTMLDocument from "../components/HTMLDocument";

export default function () {
  return function* (next) {
    const routes = yield getRoutes();
    const routerProps = yield getRouterProps(routes, this.req.url);
    const state = yield getState(routerProps);
    const markup = React.renderToString(
      <Provider store={ store }>
        { () => <Router {...routerProps} /> }
      </Provider>
    );
    const stats = require("../assets/webpack-stats.json");
    const html = React.renderToStaticMarkup(
      <HTMLDocument
        markup={ markup }
        payload={ JSON.stringify(state) }
        { ...stats } />
    );

    this.body = `<!doctype html>${html}`;
  };
}

const getRoutes = () => new Promise((resolve, reject) => {
  let timer = setInterval(() => {
    try {
      const routes = require("../assets/routes.compiled");
      clearInterval(timer);
      timer = null;
      resolve(routes);
    }
    catch (ex) {
      console.log("Awaiting assets...");
    }
  }, 100);
});

const getRouterProps = (routes, url) => new Promise((resolve, reject) => {
  const location = new Location(url);

  try {
    Router.run(routes, location, (err, props, abort={}) => {
      if (abort.isCancelled) {
        return reject(abort);
      }
      err ? reject(err) : resolve(props);
    });
  }
  catch (ex) {
    reject(ex);
  }
});


const getState = ({ params, components, branch }) => {
  const { dispatch } = store;

  return new Promise(async (resolve, reject) => {
    const promises = components
      .filter((component) => typeof component.fetchData === "function")
      .map((component) => component.fetchData(params, dispatch));

    try {
      let data = await Promise.all(promises);

      resolve(store.getState());
    }
    catch (ex) {
      reject(ex);
    }
  });
};
