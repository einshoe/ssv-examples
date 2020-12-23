// frontend/src/components/Modal.js

import React, { Component } from "react";
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Input,
  Label
} from "reactstrap";

export default class CustomModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: this.props.activeItem
    };
  }
  handleChange = e => {
    let { name, value } = e.target;
    if (e.target.type === "checkbox") {
      value = e.target.checked;
    }
    const activeItem = { ...this.state.activeItem, [name]: value };
    this.setState({ activeItem });
  };
  render() {
    const { toggle, onSave } = this.props;
    return (
      <Modal isOpen={true} toggle={toggle}>
        <ModalHeader toggle={toggle}> Todo Item </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label for="filepath">FilePath</Label>
              <Input
                type="text"
                name="filepath"
                value={this.state.activeItem.filepath}
                onChange={this.handleChange}
                placeholder="Enter filepath"
              />
            </FormGroup>
            <FormGroup>
              <Label for="published_date">Published Date</Label>
              <Input
                type="date"
                name="published_date"
                value={this.state.activeItem.published_date}
                onChange={this.handleChange}
                placeholder="Enter Date Published"
              />
            </FormGroup>
            <FormGroup>
              <Label for="config">Config</Label>
              <Input
                type="textarea"
                name="config"
                value={this.state.activeItem.config}
                onChange={this.handleChange}
                placeholder="Enter Config"
              />
            </FormGroup>
            <FormGroup>
              <Label for="survey">Survey</Label>
              <Input
                type="text"
                name="survey"
                value={this.state.activeItem.survey}
                onChange={this.handleChange}
                placeholder="Enter Survey"
              />
            </FormGroup>
            <FormGroup>
              <Label for="redshift">Redshift</Label>
              <Input
                type="float"
                name="redshift"
                value={this.state.activeItem.redshift}
                onChange={this.handleChange}
                placeholder="Enter Redshift"
              />
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="success" onClick={() => onSave(this.state.activeItem)}>
            Save
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}