var Dispatcher = null;

var Channel = React.createClass({
	select: function(e) {
		e.preventDefault();
		Dispatcher.dispatch({actionType: "set", key: "raid", value: ""});
		Dispatcher.dispatch({actionType: "set", key: "channel", value:this.props.name});
	},
	render: function() {
		var classes = [ "raidChannel" ];
		if ( this.props.name == this.props.selected ) {
			classes.push("active");
		}
		return(
			<div className={classes.join(" ")}>
				<a onClick={this.select} href="#">{this.props.name}</a> <span className="floatright">{this.props.number}</span>
			</div>
		);
	},
});

var ChannelList = React.createClass({
	render: function() {
		var channelList = (<div/>)
		if ( typeof this.props.data != "undefined" ) {
			channelList = (<strong>There are currently no raids being hosted</strong>);
		}
		var channels = [];
		var channelRaids = [];
		for ( var c in this.props.data ) {
			var raids = 0;
			for ( var r in this.props.data[c] ) {
				raids = raids + 1;
			}
			if ( raids > 0 ) {
				channels.push(c);
				channelRaids.push(raids);
			}
		}
		if ( channels.length > 0 ) {
			for ( var i=0; i<channels.length; i++ ) {
				channels[i] = ( <Channel
					key={channels[i]}
					number={channelRaids[i]}
					name={channels[i]}
					selected={this.props.selected}/> );
			}
			channelList = channels
		}
		return(
			<div className="col-md-3">
				<h4>Channels</h4>
				{channelList}
				{this.props.host}
			</div>
		);
	},
});

var Raid = React.createClass({
	click: function(e) {
		Dispatcher.dispatch({actionType: "set", key: "raid", value: this.props.data.uuid});
		e.preventDefault();
	},
	render: function() {
		className = "raid";
		if ( this.props.selected == this.props.data.uuid ) {
			className = className + " active";
		}
		var now = Date.now();
		var then = Date.parse(this.props.data.created_at);
		var ago = Math.round((now - then) / 8640000) / 10;
		if ( ago == 0 ) {
			ago = "0.0";
		}
		return (
			<div className={className}>
				<div className="row">
					<div className="col-md-9">
						<a onClick={this.click} href="#">{this.props.data.name}</a>
					</div>
					<div className="col-md-3">
						<em>{ago}</em> days ago | <em>{this.props.number}</em>
					</div>
				</div>
			</div>);
	}
});

var RaidList = React.createClass({
	render: function() {
		var raidList = (
			<strong>
				Please select a channel to see the raid list
			</strong>
		);
		var channel = this.props.channel;
		if ( channel != "" ) {
			var raids = [];
			for ( var uuid in this.props.data[channel] ) {
				raids.push( this.props.data[channel][uuid] );
			}
			raids.sort(function(a, b) {
				if ( a.created_at < b.created_at ) {
					return -1;
				}
				if ( a.created_at > b.created_at ) {
					return 1;
				}
				return 0;
			});
			raidList = [];
			for ( var i=0; i<raids.length; i++ ) {
				var raid = raids[i];
				raidList.push( (<Raid
					key={raid.uuid}
					leader={raids[i].members[0]}
					select={this.props.select}
					selected={this.props.selected}
					number={raids[i].members.length}
					data={raid}/>) );
			}
			if ( raidList.length < 1 ) {
				raidList = ( <span>This channel has no raids</span> );
			}
		}
		return(
			<div className="col-md-6">
				<h4>Events</h4>
				{raidList}
			</div>
		);
	},
});

var AltMember = React.createClass({
	leave: function(e) {
		this.props.leave(e);
	},
	render: function() {
		if ( this.props.username != this.props.name ) {
			return (<div className="member alternate">@{this.props.name}</div>)
		}
		var leaveButton = (<span/>);
		if ( this.props.doLeaveButton ) {
			leaveButton = (
				<button 
					className="floatright btn btn-warning btn-xs" 
					onClick={this.leave} 
					href="#">leave</button>
			);
		}
		return (
			<div className="member alternate">
				<span className="me">@{this.props.name}</span>
				{leaveButton}
			</div>
		);
	}
});

var Member = React.createClass({
	leave: function(e) {
		this.props.leave(e);
	},
	render: function() {
		if ( this.props.username != this.props.name ) {
			return (<div className="member">@{this.props.name}</div>)
		}
		var leaveButton = (<span/>);
		if ( this.props.doLeaveButton ) {
			leaveButton = (
				<button className="floatright btn btn-warning btn-xs" onClick={this.leave} href="#">leave</button>
			);
		}
		return (
			<div className="member">
				<span className="me">@{this.props.name}</span>
				{leaveButton}
			</div>
		);
	}
});

var MemberList = React.createClass({
	join: function(e) {
		this.props.join(this.props.channel, this.props.data[this.props.channel][this.props.raid].name);
		e.preventDefault();
	},
	leave: function(e) {
		this.props.leave(this.props.channel, this.props.data[this.props.channel][this.props.raid].name);
		e.preventDefault();
	},
	joinAlt: function(e) {
		this.props.joinAlt(this.props.channel, this.props.data[this.props.channel][this.props.raid].name);
		e.preventDefault();
	},
	leaveAlt: function(e) {
		this.props.leaveAlt(this.props.channel, this.props.data[this.props.channel][this.props.raid].name);
		e.preventDefault();
	},
	finish: function(e) {
		this.props.finish(this.props.channel, this.props.data[this.props.channel][this.props.raid].name);
		e.preventDefault();
	},
	ping: function(e) {
		this.props.ping(this.props.channel, this.props.data[this.props.channel][this.props.raid].name);
		e.preventDefault();
	},
	render: function() {
		var myMemberList = (
			<strong>
				Please select a raid to see the member list and be able to join or part
			</strong>
		);
		var myAltList = (<div/>);
		var isMember = false;
		if ( this.props.channel != "" ) {
			if ( this.props.raid != "" ) {
				memberList = this.props.data[this.props.channel][this.props.raid].members;
				if ( memberList.length < 1 ) {
					myMemberList = (<span>This raid has no members</span>);
				} else {
					myMemberList = []
					var lastSelf = -1;
					for ( var i = 0; i<memberList.length; i++ ) {
						if ( memberList[i] == this.props.username ) {
							lastSelf = i;
						}
					}
					for ( var i = 0; i<memberList.length; i++ ) {
						if ( memberList[i] == this.props.username ) {
							isMember = true;
						}
						var doLeaveButton = false;
						if ( i == lastSelf ) {
							doLeaveButton = true;
						}
						myMemberList[i] = (
							<Member
								channel={this.props.channel}
								raid={this.props.data[this.props.channel][this.props.raid].name}
								key={this.props.raid.uuid + "-" + memberList[i] + "-" + i}
								name={memberList[i]}
								username={this.props.username}
								leader={this.props.data[this.props.channel][this.props.raid].members[0]}
								leave={this.leave}
								doLeaveButton={doLeaveButton}
								finish={this.props.finish}/>
						);
					}
				}
				var altList = this.props.data[this.props.channel][this.props.raid].alts;
				myAltList = [(
					<h4 key="alt" className="alternate">Alternates</h4>)];
				if ( typeof altList == "object" && altList != null && altList.length > 0 ) {
					var lastSelf = -1;
					for ( var i = 0; i<altList.length; i++ ) {
						if ( altList[i] == this.props.username ) {
							lastSelf = i;
						}
					}
					for ( i=0; i<altList.length; i++ ) {
						var doLeaveButton = false;
						if ( i == lastSelf ) {
							doLeaveButton = true;
						}
						myAltList.push(
							<AltMember
								channel={this.props.channel}
								raid={this.props.data[this.props.channel][this.props.raid].name}
								key={this.props.raid.uuid + "-alt-" + altList[i] + "-" + i}
								name={altList[i]}
								username={this.props.username}
								leader={this.props.data[this.props.channel][this.props.raid].members[0]}
								leave={this.leaveAlt}
								doLeaveButton={doLeaveButton}
								finish={this.props.finish}/>
						);
					}
				}

				var btnJ  = ( <button className="btn btn-success" onClick={this.join}>join</button> );
				var btnJA = ( <button className="btn btn-success" onClick={this.joinAlt}>join-alt</button> );
				var btnP  = ( <button className="btn btn-warning" onClick={this.ping} href="#">ping</button> );
				var btnF  = ( <button className="btn btn-danger" onClick={this.finish} href="#">finish</button> );

				var joinBlock = ( <div>{btnJ}&nbsp;{btnJA}</div> );

				isAdmin = false;
				for ( var i=0; i<this.props.admins.length; i++ ) {
					if ( this.props.admins[i] == this.props.username ) {
						isAdmin = true;
						break;
					}
				}

				if ( isMember || isAdmin ) {
					var leader = this.props.data[this.props.channel][this.props.raid].members[0]
					if ( leader == this.props.username || isAdmin ) {
						joinBlock = ( <div> {btnJ}&nbsp;{btnJA}&nbsp;{btnP}&nbsp;{btnF}</div> );
					}
				}
			}
		}
		return(
			<div className="col-md-3">
				<h4>Members</h4>
				{myMemberList}
				{myAltList}
				<div style={{padding: "0.15em"}}>
					{joinBlock}
				</div>
			</div>
		);
	},
});

var HostForm = React.createClass({
	getInitialState: function() {
		return {
			error: "",
			channel: "",
			raid: "",
		}
	},
	submit: function(e) {
		if ( this.state.channel == "" ) {
			Dispatcher.dispatch({actionType: "set", key: "error", value: "please select a channel"});
			return;
		}
		if ( this.state.raid == "" ) {
			Dispatcher.dispatch({actionType: "set", key: "error", value: "please enter an event name"});
			return;
		}
		jQuery.post("/rest/raid/host", {channel: this.state.channel, raid: this.state.raid})
			.done(function(data) {
				Dispatcher.dispatch({actionType: "set", key: "error", value: ""});
				this.props.cancel(e)
			}.bind(this))
			.fail(function(data) {
				if ( data.status == 403 ) {
					location.reload(true);
				}
				Dispatcher.dispatch({actionType: "set", key: "error", value: responseText});
			}.bind(this));
	},
	handleRaid: function(event) { 
		Dispatcher.dispatch({actionType: "set", key: "raid", value: event.target.value});
	},
	handleChannel: function(event) {
		Dispatcher.dispatch({actionType: "set", key: "channel", value: event.target.value});
	},
	render: function() {
		var channels = [
			"",
		];
		for ( var i=0; i<this.props.channels.length; i++ ) {
			channels.push(this.props.channels[i]);
		}

		for ( var i=0; i<channels.length; i++ ) {
			if ( i == 0 ) {
				channels[i] = (<option key="" value="">-- Select a Channel --</option>);
			} else {
				channels[i] = (<option key={channels[i]} value={channels[i]}>{channels[i]}</option>);
			}
		}

		var errMsg = (<div/>);
		if ( this.state.error != "" ) {
			errMsg = ( <p className="bg-danger">{this.state.error}</p> );
		}
		return (
			<div className="col-md-6 col-md-offset-3">
			<h4>Host an Event</h4>
				<div className="form-group">
					<label htmlFor="channel">Channel to Host in</label>
					<select className="form-control" onChange={this.handleChannel}>
						{channels}
					</select>
				</div>
				<div className="form-group">
					<label htmlFor="name">Name of your Event</label>
					<input 
						onChange={this.handleRaid}
						type="text" className="form-control" id="name" placeholder="Event Name"/>
					<div className="row">
						<div className="col-md-8 col-md-offset-2">
							<em>Be sure to include the date, time, and tome zone for your event</em>
						</div>
					</div>
				</div>
				{errMsg}
				<button
					onClick={this.submit}
					className="btn btn-primary">Host Event</button>
				<button
					onClick={this.props.cancel}
					className="btn btn-link">Never Mind...</button>
			</div>
		);
	}
});

var App = React.createClass({
	getInitialState: function() {
		return Datastore.data
	},
	post: function(what, data) {
		jQuery.post("/rest/raid/" + what, data)
		.fail( function( data ) {
			if ( data.status == 403 ) {
				location.reload( true );
			}
		} );
	},
	joinRaidAlt: function(channel, raid) {
		this.post( "join-alt",  { channel: channel, raid: raid });
	},
	leaveRaidAlt: function(channel, raid) {
		this.post( "leave-alt", { channel: channel, raid: raid });
	},
	joinRaid: function(channel, raid) {
		this.post( "join", { channel: channel, raid: raid });
	},
	leaveRaid: function(channel, raid) {
		this.post( "leave", { channel: channel, raid: raid });
	},
	pingRaid: function(channel, raid) {
		this.post( "ping", { channel: channel, raid: raid });
	},
	finishRaid: function(channel, raid) {
		this.post( "finish", { channel: channel, raid: raid });
	},
	componentDidMount: function() {
		jQuery.getJSON("/rest/login/check")
			.done(function(data) {
				if ( typeof data.username == "string" && data.username != "" ) {
					Dispatcher.dispatch({actionType: "set", key: "cmd", value: data.cmd});
					Dispatcher.dispatch({actionType: "set", key: "checked", value: true});
					Dispatcher.dispatch({actionType: "set", key: "username", value: data.username});
					Dispatcher.dispatch({actionType: "set", key: "authenticated", value: true});
				} else {
					Dispatcher.dispatch({actionType: "set", key: "cmd", value: data.cmd});
					Dispatcher.dispatch({actionType: "set", key: "checked", value: true});
				}
				Datastore.subscribe(this.acceptData.bind(this))
				this.updateData();
			}.bind(this));
	},
	updateData: function() {
		if ( this.state.authenticated == false ) {
			window.setTimeout(this.updateData, 1000);
			return;
		}
		jQuery.getJSON("/rest/get?since="+this.state.updated_at)
			.done(function(data) {
				Dispatcher.dispatch({actionType: "serverStateUpdate", data: data});
			}.bind(this))
			.fail(function(data) {
				if ( data.status == 403 ) {
					location.reload(true);
				}
			}.bind(this))
			.always(function() {
				window.setTimeout(this.updateData, 250);
			}.bind(this))
	},
	acceptData: function(newData) {
		this.setState(newData);
	},
	render: function() {
		console.log(this)
		if ( this.state.checked == false ) {
			return (<div/>);
		}

		if ( this.state.authenticated == false ) {
			return(
				<div className="container-fluid">
					<div className="row">
						<div className="col-md-6 col-md-offset-3 center">
							<h2 className="dark">
							please use the slack command &ldquo;<strong>{this.state.command}</strong>&rdquo; to log in
							</h2>
						</div>
					</div>
				</div>
			);
		}

		if ( typeof this.state.raids == "undefined" ) {
			return (<div/>);
		}
		var header = (
			<div className="container-fluid nopadding">
				<div className="row nomargin">
					<div className="col-md-12 nomargin">
						<h2 className="nomargin">
							FoF @{this.state.username}
						</h2>
					</div>
				</div>
			</div>
		);

		if ( this.state.hosting ) {
			return (
				<div>
					{header}
					<div className="container-fluid">
						<div className="row">
							<HostForm channels={this.state.channels} cancel={function() {
								Dispatcher.dispatch({actionType: "set", key: "hosting", value: false});
							}.bind(this)}/>
						</div>
					</div>
				</div>
			);
		}
		
		var hostButton = (
					<button
						onClick={function(e) {
							e.preventDefault();
							Dispatcher.dispatch({actionType: "set", key: "hosting", value: true});	
						}.bind(this)}
						className="btn btn-default btn-block btn-success">Host an Event</button>
		);

		return(
			<div>
				{header}
				<div className="container-fluid">
					<div className="row">
						<ChannelList
							data={this.state.raids}
							select={this.selectChannel}
							selected={this.state.channel}
							host={hostButton}/>
						<RaidList data={this.state.raids}
							channel={this.state.channel}
							selected={this.state.raid}
							select={this.selectRaid}/>
						<MemberList
							username={this.state.username}
							channel={this.state.channel}
							raid={this.state.raid}
							join={this.joinRaid}
							leave={this.leaveRaid}
							joinAlt={this.joinRaidAlt}
							leaveAlt={this.leaveRaidAlt}
							finish={this.finishRaid}
							ping={this.pingRaid}
							data={this.state.raids}
							admins={this.state.admins}/>
					</div>
				</div>
			</div>
		);
	},
});

var Datastore = {
	callbacks: [],
	data: {
		raid: "", // Selected Raid UUID
		channel: "", // Selected Raid Channel
		authenticated: false,
		checkedUsername: false,
		username: "",
		checked: false,
		command: "",
		updated_at: "",
		hosting: false,
		channels: [],
	},
	subscribe: function(callback) {
		this.callbacks.push(callback);
	},
	setThing: function(thing, value) {
		this.data[thing] = value;
		this.emitChange();
	},
	emitChange: function() {
		for( var i = 0; i < this.callbacks.length; i++ ) {
			this.callbacks[i]( this.data );
		}
	}
}

if ( typeof fluxify == "undefined" ) {
	var Flux = require('./Flux.js');
	Dispatcher =  new Flux.Dispatcher();
} else {
	Dispatcher = fluxify.dispatcher;
}

Dispatcher.register(function(payload) {
	var doReRender = false;
	switch ( payload.actionType ) {
		case "serverStateUpdate":
			for ( var i in payload.data ) {
				Datastore.data[i] = payload.data[i];
			}
			Datastore.emitChange();
		case "set":
			Datastore.setThing(payload.key, payload.value);
	}
});

jQuery(document).ready(function() {
	React.render(<App />, document.getElementById('app'));
})
