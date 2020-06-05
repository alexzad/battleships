'use strict';

const fapp = firebase.app();
const db = firebase.firestore();

const Router = window.ReactRouterDOM.BrowserRouter;
const Route =  window.ReactRouterDOM.Route;
const Link =  window.ReactRouterDOM.Link;
const Prompt =  window.ReactRouterDOM.Prompt;
const Switch = window.ReactRouterDOM.Switch;
const Redirect = window.ReactRouterDOM.Redirect;

const EMPTY_MAP = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0
];

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
        Promise.all([
            db.collection('games').where("host", "==", user.displayName).get(),
            db.collection('games').where("guest", "==", user.displayName).get()
        ]).then(q => {
            let games = q[0].docs.concat(q[1].docs).map(g => {
                let d = g.data();
                return {
                    id: g.id, 
                    host: d.host,
                    guest: d.guest
                };
            });
            that.setState({games: games});
        });
    } 

    createGame() {
        let currentUser = this.state.user.displayName;
        db.collection('maps').add({
            ts: firebase.firestore.FieldValue.serverTimestamp(),
            owner: currentUser,
            map: EMPTY_MAP
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
                    {this.state.user ? (this.state.games.map(g => (<li key={g.id}><Link to={"/games/"+g.id}>game: {g.id}; host: {g.host}; guest: {g.guest}</Link></li>))) : "" }
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
        this.state = { user: {}, map: EMPTY_MAP };
        this.onAuthStateChanged = this.onAuthStateChanged.bind(this);          
        this.gameChanged = this.gameChanged.bind(this);          
        this.cellClick = this.cellClick.bind(this);
        firebase.auth().onAuthStateChanged(this.onAuthStateChanged); 
    }

    gameChanged(game) {
        let d = game.data();

        this.setState({ game: d });
    }

    onAuthStateChanged(user) {
        this.setState({user : user});

        db.collection('games').doc(this.props.match.params.id).get().then(g => {
            var data = g.data();
            if(data.host != user.displayName && !data.guestMap) {
                db.collection('maps').add({
                    ts: firebase.firestore.FieldValue.serverTimestamp(),
                    owner: user.displayName,
                    map: this.state.map
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

    cellClick(i) {
        if(this.state.map[i] == 0) {
            const allowedNeighbours = [+1, -1, +10, -10];
            const blockedNeighbours = [+9, +11, -9, -11];
            let c = 1 + allowedNeighbours.reduce((a, m) => {
                if(i + m >= 0 
                    && i + m < 100 
                    && this.state.map[i + m] != 9
                    && (
                        (i + m) % 10 == i % 10 
                        || Math.floor((i + m) / 10) == Math.floor(i / 10)
                    ) 
                ) {
                    return a += this.state.map[i + m];
                } else {
                    return a;
                }
            }, 0);
            if(c > 4) {
                return;
            }
            this.fillRecursively(this.state.map, i, c)
            blockedNeighbours.forEach(m => {
                if(i + m >= 0 
                    && i + m < 100
                    && Math.abs((i + m) % 10 - i % 10) == 1
                ) {
                    this.state.map[i + m] = 9
                }
            });
            this.setState({map: this.state.map});
        }
    }

    fillRecursively(map, i, c) {
        const allowedNeighbours = [+1, -1, +10, -10];
        map[i] = c;
        allowedNeighbours.forEach(m => {
            if(i + m >= 0 
                && i + m < 100 
                && map[i + m] > 0 
                && map[i + m] < 9
                && map[i + m] != c
                && (
                    (i + m) % 10 == i % 10 
                    || Math.floor((i + m) / 10) == Math.floor(i / 10)
                ) 
            ) {
                this.fillRecursively(map, i + m, c);
            }
        });
    }
    
    render() {
        return (
            <div>
                <div><Link to="/">Back to lobby</Link></div>
                <div>Game: {this.props.match.params.id}</div>
                <div>Palyer: {this.state.user.displayName}</div>
                <div className="container">
                    {this.state.map.map((c, i) => {
                        return (
                            <div className={"cell color-"+c} onClick={() => this.cellClick(i)} key={i}>{c}</div>
                        );
                    })}
                </div>
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