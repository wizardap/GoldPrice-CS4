import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:4000');

function App() {
  const keyID = location.pathname.split("/")[location.pathname.split("/").length - 1];
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(true);
  const [value, setValue] = useState("");

  socket.on("price_update", (data) => {
    console.log("Price update received:", data);
    if (data.key === keyID) {
      setValue(data.value); // Update the value if the key matches
    }
  });
  function fetchValue() {
    setLoading(true); // Set loading to true before fetching
    fetch(`http://localhost:8080/get/${keyID}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Key not found");
        }
        return response.text();
      })
      .then((data) => {
        setValue(data);
        setValid(true);
      })
      .catch((error) => {
        setValid(false);
      })
      .finally(() => {
        setLoading(false); // Set loading to false after fetching
      });
  }

  useEffect(() => {
    fetchValue();
  }, []);

  return (
    <>
    {/* // createa a nav bar with 3 option SJC,PNJ, DOJI */}
      <nav>
        <ul>
          <li><a href="SJC">SJC</a></li>
          <li><a href="PNJ">PNJ</a></li>
          <li><a href="DOJI">DOJI</a></li>
        </ul>
      </nav>
      {valid ? (
        <div>
          Value of {keyID}: {loading ? "Loading..." : value}
        </div>
      ) : (
        <div>Key not found</div>
      )}
    </>
  );
}

export default App;