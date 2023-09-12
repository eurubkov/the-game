import * as React from "react";

const cardStyle = {
    width: "5em",
    height: "7em",
    boxShadow: "0 0.0625em 0.125em rgba(0, 0, 0, 0.15)",
    borderRadius: "0.5em",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    color: "white",
    margin: "5px"
}
const Card = ({ value, id, ...props }) => {
    return (
        <div id={id} {...props} style={cardStyle}><h1 id={id}>{value}</h1></div>
    )
}
export default Card;