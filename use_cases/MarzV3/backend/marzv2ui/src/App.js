import React, { Component } from "react";
import Modal from "./components/Modal";
import axios from "axios";
import { Vega } from 'react-vega';

class App extends Component {
  //"https://vega.github.io/schema/vega-lite/v4.8.1.json"
  //"https://vega.github.io/schema/vega-lite/v4.json"
  constructor(props) {
    super(props);
    this.state = {
      viewJson: false,
      viewVega: false,
      activeItem: {
        filepath: "",
        survey: "",
        redshift: 0.0
      },
      fitsList: [],
      jsonList: [],
      vega: {
        "$schema": "https://vega.github.io/schema/vega-lite/v4.8.1.json",
        "description": "A simple bar chart with embedded data.",
        "data": {
          "values": [
            {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
            {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
            {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
          ]
        },
        "mark": "bar",
        "encoding": {
          "x": {"field": "a", "type": "nominal", "axis": {"labelAngle": 0}},
          "y": {"field": "b", "type": "quantitative"}
        }
      }      
    };
  }
  componentDidMount() {
    this.refreshList();
  }
  refreshList = () => {
    axios
      .get("http://localhost:8000/api/marzfits/")
      .then(res => this.setState({ fitsList: res.data }))
      .catch(err => console.log(err));
    axios
      .get("http://localhost:8000/api/marzjson/")
      .then(res => this.setState({ jsonList: res.data }))
      .catch(err => console.log(err));
  };
  displayJson = status => {
    if (status) {
      return this.setState({ viewJson: true });
    }
    return this.setState({ viewJson: false });
  };
  renderTabList = () => {
    return (
      <div className="my-5 tab-list">
        <span
          onClick={() => this.displayJson()}
          className={this.state.viewJson ? "active" : ""}
        >
          JSON
        </span>
        <span
          onClick={() => this.displayFits()}
          className={this.state.viewJson ? "" : "active"}
        >
          FITS
        </span>
      </div>
    );
  };
  renderItems = () => {
    const { viewJson } = this.state;
    const newItems = viewJson?this.state.jsonList:this.state.fitsList;
    return newItems.map(item => (
      <li
        key={item.id}
        className="list-group-item d-flex justify-content-between align-items-center"
      >
        <span
          className={`todo-title mr-2 ${
            this.state.viewJson ? "Json" : ""
          }`}
          filepath={item.filepath}
        >
          {item.filepath}
        </span>
        <span>
          <button
            onClick={() => this.editItem(item)}
            className="btn btn-secondary mr-2"
          >
            {" "}
            Edit{" "}
          </button>
          <button
            onClick={() => this.handleDelete(item)}
            className="btn btn-danger"
          >
            Delete{" "}
          </button>
          <button
            onClick={() => this.handleVega(item)}
            className="btn btn-danger"
          >
            Vega{" "}
          </button>
        </span>
      </li>
    ));
  };
  toggle = () => {
    this.setState({ modal: !this.state.modal });
  };
  handleSubmit = item => {
    this.toggle();
    if (item.id) {
      axios
        .put(`http://localhost:8000/api/marzfits/${item.id}/`, item)
        .then(res => this.refreshList());
      return;
    }
    axios
      .post("http://localhost:8000/api/marzfits/", item)
      .then(res => this.refreshList());
  };
  handleDelete = item => {
    axios
      .delete(`http://localhost:8000/api/marzfits/${item.id}`)
      .then(res => this.refreshList());
  };
  createItem = () => {
    const item = { title: "", description: "", completed: false };
    this.setState({ activeItem: item, modal: !this.state.modal });
  };
  editItem = item => {
    this.setState({ activeItem: item, modal: !this.state.modal });
  };
  handleVega = item => {
    axios
      .get(`http://localhost:8000/vega/${item.id}`)
      .then(res => {
        console.log("data",res.data);
        console.log("sample",this.state.vega);
        this.setState({ viewVega: true, vega: res.data});
      });
  };
  render() {
    if (this.state.viewVega) {
      return (
        <main className="content">
          <h1 className="text-white text-uppercase text-center my-4">Marzv2 app</h1>
          <div className="row ">
            <Vega name="myvega" spec={this.state.vega}/>
          </div>
        </main>
      );
    }
    return (
      <main className="content">
        <h1 className="text-white text-uppercase text-center my-4">Marzv2 app</h1>
        <div className="row ">
          <div className="col-md-6 col-sm-10 mx-auto p-0">
            <div className="card p-3">
              <div className="">
                <button onClick={this.createItem} className="btn btn-primary">
                  Add Spectrum File
                </button>
              </div>
              {this.renderTabList()}
              <ul className="list-group list-group-flush">
                {this.renderItems()}
              </ul>
            </div>
          </div>
        </div>
        {this.state.modal ? (
          <Modal
            activeItem={this.state.activeItem}
            toggle={this.toggle}
            onSave={this.handleSubmit}
          />
        ) : null}
      </main>
    );
  }
}
export default App;