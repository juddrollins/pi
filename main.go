package main

import (
	"fmt"
	"log"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Hello, World")
}

func main() {
	http.HandleFunc("/", helloHandler)

	port := ":8080"
	fmt.Println("Server running on http://localhost" + port)
	
	// Start server
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}