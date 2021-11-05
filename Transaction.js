import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet,TextInput } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import db from '../config'
import firebase from "firebase/compat/app"

import "firebase/compat/firestore"
export default class Transaction extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermission: null,
        scanned: false,
        scanData: '',
        buttonState: 'normal',
        scanBookId:'',
        scanStudentId:'',
        transactionMessage:''
      }
    }

    getCameraPermission = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
       
        hasCameraPermission: status === "granted",
        buttonState: id,
        scanned: false
      });
    }

    handleBarCodeScanner = async({type, data})=>{
      const {buttonState} = this.state
      if(buttonState==="bookId"){
      this.setState({
        scanned: true,
        scanBookId:data,
        buttonState: 'normal'
     
      });
       }
       else if (buttonState==="studentId"){
          this.setState({
        scanned: true,
        scanStudentId:data,
        buttonState: 'normal'
     
      });
       }
    }
    initiateBookIssue = async()=>{
      db.collection('Transactions').add({
        'StudentId':this.state.scanStudentId,
        'BookId':this.state.scanBookId,
        'TransactionType':'Issue'
      })
      db.collection('Books').doc(this.state.scanBookId).update({
        'Availability':false
      })
      db.collection('Students').doc(this.state.scanStudentId).update({
        'NumberOfBookIssues':firebase.firestore.FieldValue.increment(1)
      })
      this.setState({scanStudentId:'',
      scanBookId:''
      })
    }
    initiateBookReturn = async()=>{
      db.collection('Transactions').add({
        'StudentId':this.state.scanStudentId,
        'BookId':this.state.scanBookId,
        'TransactionType':'Return'
      })
      db.collection('Books').doc(this.state.scanBookId).update({
        'Availability':true
      })
      db.collection('Students').doc(this.state.scanStudentId).update({
        'NumberOfBookIssues':firebase.firestore.FieldValue.increment(-1)
      })
      this.setState({scanStudentId:'',
      scanBookId:''
      })
    }
    checkBookEligibility = async () => {
      const bookRef = await db
        .collection("Books")
        .where("BookId", "==", this.state.scanBookId)
        .get();
      var transactionType = "";
      if (bookRef.docs.length == 0) {
        transactionType = false;
      } else {
        bookRef.docs.map(doc => {
          var book = doc.data();
          if (book.Availability) {
            transactionType = "Issue";
          } else {
            transactionType = "Return";
          }
        });
      }
  
      return transactionType;
    };
  
    checkStudentEligibilityForBookIssue = async () => {
      const studentRef = await db
        .collection("Students")
        .where("StudentId", "==", this.state.scanStudentId)
        .get();
      var isStudentEligible = "";
      if (studentRef.docs.length == 0) {
        this.setState({
          scanStudentId: "",
          scanBookId: ""
        });
        isStudentEligible = false;
        alert("The student id doesn't exist in the database!");
      } else {
        studentRef.docs.map(doc => {
          var student = doc.data();
          if (student.NumberOfBookIssues < 2) {
            isStudentEligible = true;
          } else {
            isStudentEligible = false;
            alert("The student has already issued 2 books!");
            this.setState({
              scanStudentId: "",
              scanBookId: ""
            });
          }
        });
      }
  
      return isStudentEligible;
    };
  
    checkStudentEligibilityForReturn = async () => {
      const transactionRef = await db
        .collection("Transactions")
        .where("BookId", "==", this.state.scanBookId)
        .limit(1)
        .get();
      var isStudentEligible = "";
      transactionRef.docs.map(doc => {
        var lastBookTransaction = doc.data();
        if (lastBookTransaction.StudentId === this.state.scanStudentId) {
          isStudentEligible = true;
        } else {
          isStudentEligible = false;
          alert("The book wasn't issued by this student!");
          this.setState({
            scanStudentId: "",
            scanBookId: ""
          });
        }
      });
      return isStudentEligible;
    };
  
    handleTransaction = async () => {
      //verify if the student is eligible for book issue or return or none
      //student id exists in the database
      //issue : number of book issued < 2
      //issue: verify book availability
      //return: last transaction -> book issued by the student id
      var transactionType = await this.checkBookEligibility();
  
      if (!transactionType) {
        alert("The book doesn't exist in the library");
        this.setState({
          scanStudentId: "",
          scanBookId: ""
        });
      } else if (transactionType === "Issue") {
        var isStudentEligible = await this.checkStudentEligibilityForBookIssue();
        if (isStudentEligible) {
          this.initiateBookIssue();
          alert("Book issued to the student!");
        }
      } else {
        var isStudentEligible = await this.checkStudentEligibilityForReturn();
        if (isStudentEligible) {
          this.initiateBookReturn();
          alert("Book returned to the library!");
        }
      }
    };

    render() {
      const hasCameraPermission = this.state.hasCameraPermission;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState != "normal" && hasCameraPermission){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanner}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){
        return(
          <View style={styles.container} >

          
          <View style={styles.inputView}> 
        <TextInput
        style={styles.inputBox}
        onChangeText={text => this.setState({scanBookId:text})}
         placeholder= "Enter Book Id"
           placeholderTextColor='navy'
         value={this.state.scanBookId}
         />

         <TouchableOpacity
            style={styles.button}
            onPress={()=>{this.getCameraPermission('bookId')}}>
            <Text style={styles.buttonText}> Scan </Text>
          </TouchableOpacity>
          </View>
          <View style={styles.inputView}>
           <TextInput
        style={styles.inputBox}
         onChangeText={text => this.setState({scanStudentId:text})}
         placeholder= "Enter Student Id"
         placeholderTextColor='navy'
         value={this.state.scanStudentId}
         />
           <TouchableOpacity
            style={styles.button}
            onPress={()=>{this.getCameraPermission('studentId')}}>
            <Text style={styles.buttonText}> Scan  </Text>
          </TouchableOpacity>

        </View>
        <TouchableOpacity style={{marginLeft:150,backgroundColor:'crimson',width:60,height:30}}
        onPress={async()=>{ await this.handleTransaction()}}
        >
        <Text style={{fontSize:15,color:'white',fontWeight:'bold'}}> Submit </Text>
        </TouchableOpacity>
        </View>
        );
      }
    }
  }

  const styles = StyleSheet.create({
    
   button: {
    backgroundColor: 'crimson',
    borderWidth:1,
    borderLeftWidth:0,
    width:55,
    height:30,
    borderRadius:10
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight:'bold',
    textAlign:'center',
    marginTop:5
  },
  inputBox:{
    width:250,
    height:30,
    backgroundColor:'violet',
    borderWidth:1,
    borderRightWidth:0,
    fontSize:20
  },
  inputView:{
    flexDirection:"row",
    margin:20
  },
  container:{
    flex:1,
    backgroundColor:'salmon'
  }
  });