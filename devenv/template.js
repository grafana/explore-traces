import {sleep} from 'k6';
import tracing from 'k6/x/tracing';
// import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
    vus: 1,
    duration: "3h", 
};

const endpoint = __ENV.ENDPOINT || "otel-collector:4317"
const client = new tracing.Client({
    endpoint,
    exporter: tracing.EXPORTER_OTLP_HTTP,
    tls: {
        insecure: true,
    },
    headers: {
        'X-Scope-OrgID': '3',
    },
});

const traceDefaults = {
    attributeSemantics: tracing.SEMANTICS_HTTP,
    // randomAttributes: {count: 2, cardinality: 5},
    // randomEvents: {count: 0.1, exceptionCount: 0.2, randomAttributes: {count: 6, cardinality: 20}},
}

// jpe - add more services
const traceTemplates = [
    // fast internal calls
    {
        defaults: traceDefaults,
        spans: [
            {service: "inventory-service", name: "/item", duration: {min: 100, max: 300}, attributes: {"http.status_code": 200, "application.version": "0.3"}},
            {service: "inventory-service", name: "cache", attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "inventory-service", name: "select db", parentIdx: 0, attributes: {"db.name": "inv_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM inventory WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    {
        defaults: traceDefaults,
        spans: [
            {service: "user-service", name: "/user", duration: {min: 200, max: 400}, attributes: {"http.status_code": 200, "application.version": "0.3"}},
            {service: "user-service", name: "cache", attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "user-service", name: "select db", parentIdx: 0, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM profile WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    {
        defaults: traceDefaults,
        spans: [
            {service: "auth-service", name: "/logins", duration: {min: 100, max: 500}, attributes: {"http.status_code": 200, "application.version": "0.3"}},
            {service: "auth-service", name: "select db", attributes: {"db.name": "auth_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM logins", "application.version": "3.1"}},
        ]
    },
    // inventory service
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/in_stock", duration: {min: 200, max: 900}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/in_stock", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "inventory-service", name: "/in_stock", parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "inventory-service", name: "cache", parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "inventory-service", name: "select db", parentIdx: 2, attributes: {"db.name": "inv_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM inventory WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/location", duration: {min: 200, max: 900}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/location", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "inventory-service", name: "/location", parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "inventory-service", name: "cache", parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "inventory-service", name: "select db", parentIdx: 2, attributes: {"db.name": "inv_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM inventory WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/review", duration: {min: 200, max: 900}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/review", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "inventory-service", name: "/review", parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "inventory-service", name: "cache", parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "inventory-service", name: "select db", parentIdx: 2, attributes: {"db.name": "inv_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM inventory WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    // users service
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/profile", duration: {min: 200, max: 300}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/profile", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "user-service", name: "/profile", parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "user-service", name: "cache", parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "user-service", name: "select db", parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM profile WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/avatar", duration: {min: 700, max: 1100}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/avatar", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", duration: {min: 300, max: 500}, attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "user-service", name: "/avatar", duration: {min: 700, max: 1050}, parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "user-service", name: "cache", duration: {min: 100, max: 200}, parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "user-service", name: "select db", duration: {min: 600, max: 700}, parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM avatar WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/contacts", duration: {min: 700, max: 1100}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/contacts", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", duration: {min: 300, max: 500}, attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "user-service", name: "/contacts", duration: {min: 700, max: 1050}, parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "user-service", name: "cache", duration: {min: 100, max: 200}, parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "user-service", name: "select db", duration: {min: 600, max: 700}, parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM contacts WHERE id = $1", "application.version": "3.1"}},
        ]
    },
    // /purchase normal
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/purchase", duration: {min: 200, max: 900}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/purchase", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "cart-service", name: "/purchase", parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "cart-service", name: "select db", parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM users WHERE id = $1", "application.version": "3.1"}},
            {service: "cart-service", name: "insert db", parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "INSERT", "db.statement": "INSERT INTO users VALUES ($1)", "application.version": "3.1"}},
        ]
    },
    // /purchase failing due to db call
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/purchase", duration: {min: 200, max: 500}, attributes: {"http.status_code": 500, "application.version": "1.1", "http.url": "/purchase", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .1,
            }]},
            {service: "cart-service", name: "/purchase", parentIdx: 0, attributes: {"http.status_code": 500, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "cart-service", name: "select db", parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM users WHERE id = $1", "application.version": "3.1"}},
            {service: "cart-service", name: "insert db", parentIdx: 2, status: "error", attributes: {"db.name": "users_db", "db.operation.name": "INSERT", "db.statement": "INSERT INTO users VALUES ($1)", "application.version": "3.1"}},
        ]
    },
    // /profile slow due to mutex grab
    {
        defaults: traceDefaults,
        spans: [
            {service: "gateway", name: "/profile", duration: {min: 2500, max: 3700}, attributes: {"http.status_code": 200, "application.version": "1.1", "http.url": "/profile", "net.sock.peer.addr": "192.168.69.16"}},
            {service: "auth-service", name: "/auth", attributes: {"http.status_code": 200, "application.version": "3.1"}, duration: {min: 2800, max: 3000}, events: [{
                name: "mutex_acquire",
                percentageOfSpan: .9,
            }]},
            {service: "user-service", name: "/profile", duration: {min: 200, max: 500}, parentIdx: 0, attributes: {"http.status_code": 200, "application.version": "0.3"}, links: [{attributes: {"type": "parent", "job": "email_receipt"} } ]},
            {service: "user-service", name: "cache", parentIdx: 2, attributes: {"db.name": "cache", "db.operation.name": "GET", "application.version": "3.1"}},
            {service: "user-service", name: "select db", parentIdx: 2, attributes: {"db.name": "users_db", "db.operation.name": "SELECT", "db.statement": "SELECT * FROM profile WHERE id = $1", "application.version": "3.1"}},
        ]
    },
]

export default function () {
    const d = new Date();
    let minutes = d.getMinutes();
    // let idx = Math.floor(minutes / 5) % traceTemplates.length
    let idx = Math.floor(Math.random() * traceTemplates.length)

    const gen = new tracing.TemplatedGenerator(traceTemplates[idx])
    client.push(gen.traces())

    sleep(sleepDuration());
}

function sleepDuration() {
    const cycleTime = 300; // 300 seconds cycle
    const currentTime = Date.now() / 1000; // Current time in seconds
    const phase = (currentTime % cycleTime) / cycleTime; // Normalized phase of the cycle
    const sineValue = Math.sin(phase * 2 * Math.PI); // Oscillates between -1 and 1
    const scaledValue = (sineValue + 1) / 20; // Scale between 0 and 0.1
    return (Math.random() * scaledValue) + .01; // Random sleep between 0.01 and 0.11 seconds
}

export function teardown() {
    client.shutdown();
}