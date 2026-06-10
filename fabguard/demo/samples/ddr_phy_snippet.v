// write-leveling FSM for the DDR PHY — internal only
module ddr_wl_fsm (
    input  wire clk,
    input  wire rst_n,
    input  wire dqs_in,
    output reg  wl_done
);
    reg [1:0] state;
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state   <= 2'b00;
            wl_done <= 1'b0;
        end else begin
            case (state)
                2'b00: state <= dqs_in ? 2'b01 : 2'b00;
                2'b01: begin state <= 2'b10; wl_done <= 1'b1; end
                default: state <= 2'b00;
            endcase
        end
    end
endmodule
// netlist export: ddr_wl_fsm.gds via flow in build/run_pnr.spi
