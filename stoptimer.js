module.exports = function(RED) {
	"use strict";

	function StopTimer(n) {
		RED.nodes.createNode(this, n);

		this.units = n.units || "Second";
		this.duration = n.duration || 5;
		this.payloadval = n.payloadval || "0";
		this.payloadtype = n.payloadtype || "num";

		if (this.duration <= 0) {
			this.duration = 0;
		} else {
			if (this.units === "Second") this.duration *= 1000;
			if (this.units === "Minute") this.duration *= 60000;
			if (this.units === "Hour")   this.duration *= 3600000;
		}

		if ((this.payloadtype === "num") && (!isNaN(this.payloadval))) {
			this.payloadval = Number(this.payloadval);
		}
		else if (this.payloadval === "true" || this.payloadval === "false") {
			this.payloadval = Boolean(this.payloadval);
		}
		else if (this.payloadval === "null") {
			this.payloadtype = "null";
			this.payloadval = null;
		}
		else {
			this.payloadval = String(this.payloadval);
		}

		var node = this;
		var timeout = null;
		var interval = null;
		var stopped = false;
		var endTime = 0;

		function formatRemaining(ms) {
			var total = Math.max(0, Math.ceil(ms / 1000));
			var s = total % 60;
			var m = Math.floor(total / 60) % 60;
			var h = Math.floor(total / 3600);
			return (
				String(h).padStart(2, "0") + ":" +
				String(m).padStart(2, "0") + ":" +
				String(s).padStart(2, "0")
			);
		}

		this.on("input", function(msg) {
			node.status({});

			if (stopped === false || msg._timerpass !== true) {
				stopped = false;

				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}
				if (interval) {
					clearInterval(interval);
					interval = null;
				}

				if (msg.payload === "stop" || msg.payload === "STOP") {
					node.status({ fill: "red", shape: "ring", text: "stopped" });
					stopped = true;

					var msg2 = RED.util.cloneMessage(msg);
					msg2.payload = "stopped";
					node.send([null, msg2, null]);
					return;
				}

				msg._timerpass = true;
				endTime = Date.now() + node.duration;

				node.status({
					fill: "green",
					shape: "dot",
					text: formatRemaining(node.duration)
				});

				interval = setInterval(function() {
					var remaining = endTime - Date.now();
					if (remaining <= 0) return;

					var countdownMsg = RED.util.cloneMessage(msg);
					countdownMsg.payload = remaining;
					countdownMsg.remaining = formatRemaining(remaining);

					node.status({
						fill: "green",
						shape: "dot",
						text: countdownMsg.remaining
					});

					node.send([null, null, countdownMsg]);
				}, 1000);

				timeout = setTimeout(function() {
					if (interval) {
						clearInterval(interval);
						interval = null;
					}
					node.status({});

					if (stopped === false) {
						var msg2 = RED.util.cloneMessage(msg);
						msg2.payload = node.payloadval;
						node.send([msg, msg2, null]);
					}
					timeout = null;
				}, node.duration);
			}
		});

		this.on("close", function() {
			if (timeout) clearTimeout(timeout);
			if (interval) clearInterval(interval);
			node.status({});
		});
	}

	RED.nodes.registerType("stoptimer", StopTimer);
};
