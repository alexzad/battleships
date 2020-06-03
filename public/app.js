'use strict';

const fapp = firebase.app();
const db = firebase.firestore();

const Router = window.ReactRouterDOM.BrowserRouter;
const Route =  window.ReactRouterDOM.Route;
const Link =  window.ReactRouterDOM.Link;
const Prompt =  window.ReactRouterDOM.Prompt;
const Switch = window.ReactRouterDOM.Switch;
const Redirect = window.ReactRouterDOM.Redirect;

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = { user: firebase.auth().currentUser };
        this.createGame = this.createGame.bind(this);
        this.onAuthStateChanged = this.onAuthStateChanged.bind(this);          
        firebase.auth().onAuthStateChanged(this.onAuthStateChanged); 
    }

    onAuthStateChanged(user) {
        this.setState({user : user});
    } 

    createGame() {
        db.collection('games').add({
            createdBy: this.state.user.displayName,
            ts: firebase.firestore.FieldValue.serverTimestamp()
        }).then(result => {
            this.props.history.push('/game/' + result.id);
        });
    }

    render() {
        return (
            <div>
                <Login user={this.state.user} />
                <br/>{this.state.user ? <button onClick={this.createGame}>Create New Game</button> : "Please login" }
            </div>
        );
    }
}

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state = { user: null };
        this.googleLogin = this.googleLogin.bind(this);
    }

    googleLogin() {
        const provider = new firebase.auth.GoogleAuthProvider();
        let that = this;

        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
            .then(() => firebase.auth().signInWithPopup(provider))
            .catch(console.log);
    }

    render() {
        return this.props.user ? 
        (
            <span>Welcome, {this.props.user.displayName}!</span>
        ) : (
            <button onClick={this.googleLogin}>
                Login with Google
            </button>
        );
    }
}

class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = { user: null };
    }
    
    render() {
        return (
            <div>Game: {this.props.match.params.id}</div>

        );
    }
}

ReactDOM.render((
    <Router>
        <div>
        <Switch>
            <Route path="/" exact component={App}/>
            <Route path="/game/:id" component={Game}/>
        </Switch>
        </div>
    </Router>
), document.getElementById('app-container'));