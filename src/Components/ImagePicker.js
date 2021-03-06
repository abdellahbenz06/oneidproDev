import React, { Component } from 'react';
import {
  Text, View, TouchableHighlight, Alert,
} from 'react-native';
import { Icon } from 'native-base';
import PropTypes from 'prop-types';
import {
  MediaLibrary, Permissions, ImagePicker, FileSystem,
} from 'expo';

import Modal from 'react-native-modal';

import randomString from '../Functions/randomString';
import DocumentViewer from './DocumentViewer';

import Config from '../../env';

import colour from '../Styles/colors';
import styles from '../Styles/style';

export default class ImagePickerPlus extends Component {
  static propTypes = {
    displayLabel: PropTypes.string.isRequired,
    onPick: PropTypes.func,
    willPick: PropTypes.func,
    justAdd: PropTypes.bool,
    label: PropTypes.string,
    name: PropTypes.string,
    required: PropTypes.bool,
  }

  static defaultProps = {
    justAdd: false,
    willPick: () => {},
    onPick: () => {},
    label: null,
    name: randomString(6),
    required: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      modalVisible: false,
      label: this.props.label ? this.props.label : 'select',
    };
  }

  UNSAFE_componentWillMount() {
    this.props.willPick();
    this.requestCameraPermission();
  }

  async requestCameraPermission() {
    try {
      const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
      const perm2 = await Permissions.askAsync(Permissions.CAMERA);

      this.setState({ hasCameraRollPermission: (status === 'granted') && (perm2.status === 'granted') });
    } catch (err) {
      console.warn(err);
    }
  }

  async saveImage(uri) {
    FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}${Config.NAME}`, { intermediates: true }).catch((e) => {
      console.log(e, 'Directory exists');
    });
    FileSystem.moveAsync({
      from: uri,
      to: `${FileSystem.documentDirectory}${Config.NAME}/${this.props.name}.png`,
    }).then(() => {
    });

    const asset = await MediaLibrary.createAssetAsync(`${FileSystem.documentDirectory}${Config.NAME}/${this.props.name}.png`);
    const album = await MediaLibrary.getAlbumAsync(Config.NAME);

    if (album === null) {
      MediaLibrary.createAlbumAsync(Config.NAME, asset, false);
    } else {
      MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
    }

    const newUri = asset.uri.replace(/DCIM/, Config.NAME);
    // TODO : à tester l'adresse pour iPhone

    this.setState({
      modalVisible: false, documentPicked: true, uri: newUri,
    });
    this.props.onPick(this.state.label, newUri);
  }

  render() {
    if (this.state.documentPicked && !this.props.justAdd) {
      return (
        <DocumentViewer source={this.state.uri} label={this.props.displayLabel} />
      );
    }
    return (
      <View style={{ margin: 25 }}>
        <TouchableHighlight
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: this.props.required ? colour.error : colour.primary,
            flexDirection: 'row',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'center',
            margin: 25,
            elevation: 1,
          }}
          underlayColor={colour.primarydark}
          onPress={async () => {
            this.setState({ modalVisible: true });
          }}
        >
          <Icon name="add" style={{ color: '#fff' }} />
        </TouchableHighlight>

        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.text}>{this.props.displayLabel}</Text>
        </View>

        <Modal
          isVisible={this.state.modalVisible}
          animationIn="slideInUp"
          animationInTiming={300}
          onBackdropPress={() => this.setState({ modalVisible: false })}
          onBackButtonPress={() => this.setState({ modalVisible: false })}
          onSwipe={() => this.setState({ modalVisible: false })}
          swipeDirection="down"
          style={{
            justifyContent: 'flex-end',
            margin: 0,
          }}
        >
          <View style={{
            backgroundColor: 'white',
            alignItems: 'flex-start',
            borderRadius: 4,
            elevation: 2,
            padding: 16,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }}
          >
            <TouchableHighlight
              underlayColor="transparent"
              onPress={async () => {
                this.setState({ modalVisible: false, alertModal: true });
              }}
              style={{ marginBottom: 24 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="camera" style={{ marginLeft: 8, marginRight: 24, color: colour.secondary }} />
                <Text style={styles.textButton}>Prendre une photo</Text>
              </View>
            </TouchableHighlight>

            <TouchableHighlight
              underlayColor="transparent"
              onPress={async () => {
                this.setState({ modalVisible: false });
                if (this.state.hasCameraRollPermission) {
                  const { cancelled, uri } = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 1 });
                  if (!cancelled) {
                    this.saveImage(uri);
                  }
                } else {
                  Alert.alert('Impossible d\'accéder à vos images', 'Veuillez recommencer et authoriser l\'application OneID à accéder à votre gallerie d\'image svp.');
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="image" style={{ marginLeft: 8, marginRight: 24, color: colour.secondary }} />
                <Text style={styles.textButton}>Choisir une image</Text>
              </View>
            </TouchableHighlight>

          </View>
        </Modal>

        <Modal
          isVisible={this.state.alertModal}
        >
          <View style={{
            backgroundColor: 'white',
            borderRadius: 4,
            elevation: 2,
            padding: 16,
            borderColor: 'rgba(0, 0, 0, 0.1)',
          }}
          >
            <Text style={styles.header}>La photo doit : </Text>
            <Text style={styles.text}>- Etre Nette</Text>
            <Text style={styles.text}>- Etre claire et lisible</Text>
            <Text style={styles.text}>- Ne pas comporter de doigt visible</Text>

            <TouchableHighlight
              style={{ marginTop: 16, alignSelf: 'flex-end' }}
              underlayColor="transparent"
              onPress={async () => {
                this.setState({ alertModal: false });
                if (this.state.hasCameraRollPermission) {
                  const { cancelled, uri } = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 1,
                  });
                  if (!cancelled) {
                    this.saveImage(uri);
                  }
                } else {
                  Alert.alert('Impossible d\'accéder à vos images', 'Veuillez recommencer et authoriser l\'application OneID à accéder à votre gallerie d\'image svp.');
                }
              }}
            >
              <Text style={styles.textButton}>{'J\'ai compris'}</Text>
            </TouchableHighlight>
          </View>
        </Modal>

      </View>

    );
  }
}
