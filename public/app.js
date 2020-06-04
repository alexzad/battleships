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
        this.state = { user: firebase.auth().currentUser, games: [] };
        this.createGame = this.createGame.bind(this);
        this.onAuthStateChanged = this.onAuthStateChanged.bind(this);          
        firebase.auth().onAuthStateChanged(this.onAuthStateChanged); 
    }

    onAuthStateChanged(user) {
        this.setState({user : user});
        let that = this;
        db.collection('games').where("host", "==", user.displayName).get().then(q => {
            let games = q.docs.map(g => g.id);
            that.setState({games: games});
        });
    } 

    createGame() {
        let currentUser = this.state.user.displayName;
        db.collection('maps').add({
            ts: firebase.firestore.FieldValue.serverTimestamp(),
            owner: currentUser,
            map: []
        }).then(result => {
                db.collection('games').add({
                ts: firebase.firestore.FieldValue.serverTimestamp(),
                host: currentUser,
                hostMap: result.id,
                guest: null,
                guestMap: null,
                moves: []
            }).then(result => {
                this.props.history.push('/games/' + result.id);
            });
        });       
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    }

    render() {
        return (
            <div>
                <Login user={this.state.user} />
                <br/>{this.state.user ? <button onClick={this.createGame} key="btn">Create New Game</button> : "Please login" }
                <ul>
                    {this.state.user ? this.state.games.map(i => (<li key={i}><Link to={"/games/"+i}>{i}</Link></li>)) : "" }
                </ul>
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
        this.state = { user: {} };
        this.onAuthStateChanged = this.onAuthStateChanged.bind(this);          
        this.gameChanged = this.gameChanged.bind(this);          
        firebase.auth().onAuthStateChanged(this.onAuthStateChanged); 
    }

    gameChanged(game) {

    }

    onAuthStateChanged(user) {
        this.setState({user : user});

        db.collection('games').doc(this.props.match.params.id).get().then(g => {
            var data = g.data();
            if(data.host != user.displayName && !data.guestMap) {
                db.collection('maps').add({
                    ts: firebase.firestore.FieldValue.serverTimestamp(),
                    owner: user.displayName,
                    map: []
                }).then(m => {
                    db.collection('games').doc(this.props.match.params.id).set({
                        guest: user.displayName,
                        guestMap: m.id,
                    }, { merge: true }).then(result => {
        
                    });
                });
            }
        });

        db.collection('games').doc(this.props.match.params.id).onSnapshot(this.gameChanged);
    } 
    
    render() {
        return (
            <div>
                <div><Link to="/">Back to lobby</Link></div>
                <div>Game: {this.props.match.params.id}</div>
                <div>Palyer: {this.state.user.displayName}</div>
            </div>
        );
    }
}

ReactDOM.render((
    <Router>
        <div>
        <Switch>
            <Route path="/" exact component={App}/>
            <Route path="/games/:id" component={Game}/>
        </Switch>
        </div>
    </Router>
), document.getElementById('app-container'));