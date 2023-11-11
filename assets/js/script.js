var urlParams = new URLSearchParams(window.location.search);
var clientId = urlParams.get("id");
if (clientId) {
  $(document).ready(function () {
    var socket = io();
    socket.emit("create-session", {
      id: clientId,
    });
    socket.on("qr", function (data) {
      if (data.id === clientId) {
        $("#readyDiv").hide();
        $("#scanDiv").show();
        $(`#qrcode`).attr("src", data.src).show();
        $(`#title`).html("");
      }
    });
    socket.on("name", function (data) {
      if (data.id === clientId) {
        $("#scanDiv").hide();
        $("#readyDiv").show();
        $(`#qrcode`).attr("src", "").hide();
        $(`#title`).html(data.name);
        if (!data.name) {
          $(`.logs`).append(
            $("<li>").text(
              "Silahkan reload jika nama WhatsApp anda tidak tampil"
            )
          );
        }
        console.log(data);
      }
    });
  });
} else {
  console.error("ID not found");
}