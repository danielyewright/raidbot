package main

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gorilla/sessions"
)

var errInvalidMethod = errors.New("Invalid Method")
var errInvalidAuth = errors.New("Invalid Authentication")
var hmacKey = make([]byte, 32)
var hmacEmpty = make([]byte, 32)

var store *sessions.CookieStore

func generateAPIKeyForUserTime(username string, age int) string {
	hm := hmac.New(sha1.New, hmacKey)
	fmt.Fprintln(hm, username, int(math.Ceil(float64(time.Now().Unix())/3600))-age)
	return fmt.Sprintf("%x", hm.Sum(nil))
}

func generateKeyForUserTime(username string, age int) string {
	hm := hmac.New(md5.New, hmacKey)
	fmt.Fprintln(hm, username, int(math.Ceil(float64(time.Now().Unix())/60))-age)
	return fmt.Sprintf("%x", hm.Sum(nil))[2:8]
}

func requireMethod(method string, w http.ResponseWriter, r *http.Request) error {
	if r.Method != method {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return errInvalidMethod
	}
	return nil
}

func requireAPIKey(session *sessions.Session, w http.ResponseWriter) error {
	var username string
	var apiKey string

	n, ok := session.Values["username"]
	if !ok {
		w.WriteHeader(http.StatusForbidden)
		return errInvalidAuth
	}
	username = n.(string)

	a, ok := session.Values["apiKey"]
	if !ok {
		w.WriteHeader(http.StatusForbidden)
		return errInvalidAuth
	}
	apiKey = a.(string)

	for i := 0; i < 10; i++ {
		if apiKey == generateAPIKeyForUserTime(username, i) {
			return nil
		}
	}

	w.WriteHeader(http.StatusForbidden)
	return errInvalidAuth
}

func doRESTRouter(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, "raidbot")
	session.Options.MaxAge = 604800
	if err := r.ParseForm(); err != nil {
		log.Println("Error parsing form values for", r.Method, r.RequestURI, err.Error())
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	uri, _ := url.ParseRequestURI(r.RequestURI)
	v, err := url.ParseQuery(uri.RawQuery)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprint(w, err.Error())
		return
	}
	switch uri.Path {
	case "/rest/login":
		username := v.Get("username")
		t, err := strconv.ParseInt(v.Get("t"), 10, 64)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		s := v.Get("signature")
		now := time.Now().Unix()
		if t > now {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		if (now - t) > 300 {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		mac := hmac.New(sha256.New, hmacKey)
		fmt.Fprintln(mac, username, t)
		if s != fmt.Sprintf("%x", mac.Sum(nil)) {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		log.Printf("@%s -- %s", username, "/rest/login")
		session.Values["username"] = username
		session.Values["apiKey"] = generateAPIKeyForUserTime(username, 0)
		session.Save(r, w)
		http.Redirect(w, r, "http://fofgaming.com/team/", http.StatusFound)
	case "/rest/login/logout":
		delete(session.Values, "apiKey")
		delete(session.Values, "username")
		session.Save(r, w)
		return
	case "/rest/login/check":
		if name, ok := session.Values["username"]; ok {
			session.Values["apiKey"] = generateAPIKeyForUserTime(name.(string), 0)
			session.Save(r, w)
			data, _ := json.Marshal(map[string]string{"cmd": raidSlashCommand, "username": name.(string)})
			w.Write(data)
		} else {
			data, _ := json.Marshal(map[string]string{"cmd": raidSlashCommand})
			w.Write(data)
			return
		}
	case "/rest/get":
		since := v.Get("since")
		for xhrOutput.updatedAt == since {
			xhrOutput.cond.Wait()
		}
		if err := xhrOutput.send(w); err != nil {
			log.Println("Error sending /rest/raid/wait:", err.Error())
		}
		return
	case "/rest/raid/join":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "join", raid)
		msgs, err := raidJoin(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	case "/rest/raid/leave":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "leave", raid)
		msgs, err := raidLeave(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	case "/rest/raid/join-alt":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "join-alt", raid)
		msgs, err := raidAltJoin(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	case "/rest/raid/leave-alt":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "leave-alt", raid)
		msgs, err := raidAltLeave(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	case "/rest/raid/finish":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "finish", raid)
		msgs, err := raidFinish(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	case "/rest/raid/host":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "host", raid)
		msgs, err := raidHost(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	case "/rest/raid/ping":
		if err := requireMethod("POST", w, r); err != nil {
			return
		}
		if err := requireAPIKey(session, w); err != nil {
			return
		}
		username, _ := session.Values["username"].(string)
		channel := r.Form.Get("channel")
		raid := r.Form.Get("raid")
		log.Printf("@%s on %s -- %s %s", username, channel, "ping", raid)
		msgs, err := raidPing(username, channel, raid)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, msgs.stdOut())
			return
		}
		msgs.sendToSlack()
		fmt.Fprint(w, msgs.stdOut())
	}
}